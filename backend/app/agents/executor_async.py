"""
Executor agent: performs operations by calling tools via MCP (Async version)
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional
from app.agents.base import Agent, RunContext
from app.agents.schemas import ExecutionResult
from app.mcp.tools_async import BriaToolsAsync
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.agents.validation import sanitize_operation_params

logger = logging.getLogger("executor_async")

# Operation timeout in seconds
OPERATION_TIMEOUT = 300  # 5 minutes
MAX_RETRIES = 2
RETRY_DELAY = 1.0  # seconds


class ExecutorAgentAsync(Agent):
    role = "executor"
    def __init__(self, bria_client: BriaMCPClientAsync):
        super().__init__(bria_client)
        self.tools = BriaToolsAsync(bria_client)

    def name(self):
        return "executor_async"

    async def run(self, ctx: RunContext) -> RunContext:
        if not ctx.plan:
            raise RuntimeError("Executor requires a plan")
        
        if not ctx.plan.steps:
            logger.warning("Plan has no steps, marking as completed")
            ctx.exec_result = ExecutionResult(
                success=True,
                outputs={},
                logs=["No steps to execute"]
            )
            ctx.state = "COMPLETED"
            return ctx
        
        logs: List[str] = []
        outputs: Dict[str, Any] = {}
        step_index = 0

        logger.info("Executor (async) starting for run %s: %d steps to execute", ctx.run_id, len(ctx.plan.steps))

        for step in ctx.plan.steps:
            step_index += 1
            op = step.op
            params = step.params or {}
            
            logger.info("Executor step %d/%d: op=%s", step_index, len(ctx.plan.steps), op)
            logs.append(f"Step {step_index}/{len(ctx.plan.steps)}: Starting op={op}")

            try:
                # Sanitize and validate operation parameters before execution
                try:
                    params = sanitize_operation_params(op, params)
                except Exception as e:
                    raise ValueError(f"Parameter sanitization failed: {str(e)}")
                
                validation_error = self._validate_operation(op, params, ctx)
                if validation_error:
                    raise ValueError(f"Operation validation failed: {validation_error}")

                # Execute operation with retry logic
                res = await self._execute_with_retry(
                    op=op,
                    params=params,
                    ctx=ctx,
                    step_index=step_index
                )

                # Store result
                if op == "generate_image":
                    outputs.setdefault("generated", []).append(res)
                else:
                    outputs.setdefault("edits", []).append(res)
                
                logs.append(f"Step {step_index}/{len(ctx.plan.steps)}: Completed op={op}")
                logger.info("Executor step %d/%d completed successfully", step_index, len(ctx.plan.steps))

            except asyncio.TimeoutError:
                error_msg = f"Step {step_index}/{len(ctx.plan.steps)}: Operation {op} timed out after {OPERATION_TIMEOUT}s"
                logger.error(error_msg)
                logs.append(error_msg)
                ctx.exec_result = ExecutionResult(success=False, outputs=outputs, logs=logs)
                ctx.state = "FAILED"
                return ctx
            except Exception as e:
                error_msg = f"Step {step_index}/{len(ctx.plan.steps)}: Operation {op} failed: {str(e)}"
                logger.exception("Step failed: %s", e)
                logs.append(error_msg)
                
                # Check if this is a critical failure or can continue
                if self._is_critical_operation(op):
                    ctx.exec_result = ExecutionResult(success=False, outputs=outputs, logs=logs)
                    ctx.state = "FAILED"
                    return ctx
                else:
                    # Non-critical failure, log and continue
                    logs.append(f"Non-critical operation failed, continuing with remaining steps")
                    outputs.setdefault("errors", []).append({
                        "step": step_index,
                        "op": op,
                        "error": str(e)
                    })

        logger.info("Executor completed successfully for run %s", ctx.run_id)
        ctx.exec_result = ExecutionResult(success=True, outputs=outputs, logs=logs)
        ctx.state = "COMPLETED"
        return ctx
    
    def _validate_operation(self, op: str, params: Dict[str, Any], ctx: RunContext) -> Optional[str]:
        """Validate operation parameters before execution."""
        if op == "remove_background":
            if ctx.asset_id is None:
                return "remove_background requires asset_id"
        
        elif op == "expand":
            if ctx.asset_id is None:
                return "expand requires asset_id"
            if "direction" not in params:
                return "expand requires 'direction' parameter (top|bottom|left|right|all)"
        
        elif op == "enhance":
            if ctx.asset_id is None:
                return "enhance requires asset_id"
            # Validate enhancement parameters
            for key in params:
                if key in ["sharpness", "contrast", "brightness", "saturation"]:
                    val = params[key]
                    if not isinstance(val, (int, float)) or val < 0 or val > 1:
                        return f"{key} must be between 0 and 1"
        
        elif op == "generate_image":
            if "prompt" not in params or not params["prompt"]:
                return "generate_image requires 'prompt' parameter"
            if not isinstance(params["prompt"], str) or len(params["prompt"].strip()) == 0:
                return "generate_image prompt must be a non-empty string"
        
        return None  # Validation passed
    
    def _is_critical_operation(self, op: str) -> bool:
        """Determine if operation failure should stop execution."""
        # For now, all operations are critical
        # Could be made configurable per operation type
        return True
    
    async def _execute_with_retry(
        self,
        op: str,
        params: Dict[str, Any],
        ctx: RunContext,
        step_index: int
    ) -> Dict[str, Any]:
        """Execute operation with retry logic and timeout."""
        last_error = None
        
        for attempt in range(MAX_RETRIES + 1):
            try:
                if attempt > 0:
                    logger.info("Retry attempt %d/%d for op=%s", attempt, MAX_RETRIES, op)
                    await asyncio.sleep(RETRY_DELAY * attempt)  # Exponential backoff
                
                # Execute with timeout
                if op == "remove_background":
                    res = await asyncio.wait_for(
                        self.tools.edit_image(ctx.asset_id, "remove_background", params),
                        timeout=OPERATION_TIMEOUT
                    )
                elif op == "expand":
                    res = await asyncio.wait_for(
                        self.tools.edit_image(ctx.asset_id, "expand", params),
                        timeout=OPERATION_TIMEOUT
                    )
                elif op == "enhance":
                    res = await asyncio.wait_for(
                        self.tools.edit_image(ctx.asset_id, "enhance", params),
                        timeout=OPERATION_TIMEOUT
                    )
                elif op == "generate_image":
                    prompt = params.get("prompt", "")
                    if not prompt:
                        raise ValueError("generate_image requires 'prompt' parameter")
                    res = await asyncio.wait_for(
                        self.tools.generate_image(prompt, params),
                        timeout=OPERATION_TIMEOUT
                    )
                else:
                    raise ValueError(f"Unknown operation: {op}")
                
                return res
                
            except asyncio.TimeoutError:
                last_error = f"Operation {op} timed out after {OPERATION_TIMEOUT}s"
                if attempt < MAX_RETRIES:
                    continue
                raise
            except Exception as e:
                last_error = str(e)
                # Don't retry on validation errors
                if "validation" in str(e).lower() or "parameter" in str(e).lower():
                    raise
                if attempt < MAX_RETRIES:
                    logger.warning("Operation %s failed, will retry: %s", op, e)
                    continue
                raise
        
        # Should not reach here, but just in case
        raise RuntimeError(f"Operation {op} failed after {MAX_RETRIES} retries: {last_error}")

