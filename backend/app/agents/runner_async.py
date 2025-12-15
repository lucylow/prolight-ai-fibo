"""
Coordinator that runs routing: Planner → Critic → (HITL) → Executor (Async version)
"""
import logging
import time
from typing import Callable, Awaitable, Optional
from app.agents.base import RunContext
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.agents.planner_async import PlannerAgentAsync
from app.agents.critic_async import CriticAgentAsync
from app.agents.executor_async import ExecutorAgentAsync
from app.agents.validation import validate_plan, validate_critique, ValidationError

logger = logging.getLogger("runner_async")


class AgentRunnerAsync:
    def __init__(self, bria_client: BriaMCPClientAsync, event_hook: Callable[[str, dict], Awaitable[None]]):
        self.mcp = bria_client
        self.planner = PlannerAgentAsync(self.mcp)
        self.critic = CriticAgentAsync(self.mcp)
        self.executor = ExecutorAgentAsync(self.mcp)
        self.event_hook = event_hook

    async def emit(self, ctx: RunContext, typ: str, payload: dict):
        """Emit event with error handling."""
        try:
            await self.event_hook(ctx.run_id, {"type": typ, "payload": payload})
        except Exception as e:
            logger.exception("Failed to emit event %s for run %s: %s", typ, ctx.run_id, e)
            # Don't fail the workflow if event emission fails

    async def run_workflow(self, ctx: RunContext, human_approved: bool = False) -> RunContext:
        """Run the complete agent workflow: Planner → Critic → (HITL) → Executor."""
        workflow_start_time = time.time()
        logger.info("Starting workflow for run %s", ctx.run_id)
        
        try:
            # Phase 1: Planning
            try:
                await self.emit(ctx, "status", {"msg": "planner_start", "phase": "planning"})
                planning_start = time.time()
                
                ctx = await self.planner.run(ctx)
                
                planning_duration = time.time() - planning_start
                logger.info("Planning completed for run %s in %.2fs", ctx.run_id, planning_duration)
                
                if not ctx.plan:
                    raise RuntimeError("Planner did not produce a plan")
                
                # Validate plan
                is_valid, issues = validate_plan(ctx.plan)
                if not is_valid:
                    logger.warning("Plan validation failed for run %s: %s", ctx.run_id, issues)
                    await self.emit(ctx, "warning", {
                        "phase": "planning",
                        "message": "Plan validation found issues",
                        "issues": issues
                    })
                    # For now, continue with warnings (could be made configurable to fail)
                
                await self.emit(ctx, "plan", {
                    **ctx.plan.dict() if ctx.plan else {},
                    "duration_seconds": planning_duration,
                    "validation": {"valid": is_valid, "issues": issues}
                })
                
            except Exception as e:
                logger.error("Planning phase failed for run %s: %s", ctx.run_id, e)
                await self.emit(ctx, "error", {
                    "phase": "planning",
                    "error": str(e),
                    "message": f"Planning failed: {str(e)}"
                })
                ctx.state = "FAILED"
                return ctx

            # Phase 2: Critique
            try:
                await self.emit(ctx, "status", {"msg": "critic_start", "phase": "critique"})
                critique_start = time.time()
                
                ctx = await self.critic.run(ctx)
                
                critique_duration = time.time() - critique_start
                logger.info("Critique completed for run %s in %.2fs", ctx.run_id, critique_duration)
                
                if not ctx.critique:
                    logger.warning("Critic did not produce a critique, continuing anyway")
                    # Create a default critique
                    from app.agents.schemas import Critique
                    ctx.critique = Critique(ok=True, issues=[], suggestions=[])
                
                # Validate critique
                is_valid, issues = validate_critique(ctx.critique)
                if not is_valid:
                    logger.warning("Critique validation failed for run %s: %s", ctx.run_id, issues)
                
                await self.emit(ctx, "critique", {
                    **ctx.critique.dict() if ctx.critique else {},
                    "duration_seconds": critique_duration,
                    "validation": {"valid": is_valid, "issues": issues}
                })
                
            except Exception as e:
                logger.error("Critique phase failed for run %s: %s", ctx.run_id, e)
                # Critique failure is non-fatal, but log it
                await self.emit(ctx, "warning", {
                    "phase": "critique",
                    "warning": f"Critique failed: {str(e)}, continuing with plan approval",
                    "message": "Critique phase encountered an error, but workflow will continue"
                })
                # Continue with execution if critique fails (non-fatal)

            # Phase 3: Human-in-the-Loop Check
            requires_hitl = (
                (ctx.plan and ctx.plan.requires_hitl) or 
                (ctx.critique and not ctx.critique.ok)
            )
            
            if requires_hitl and not human_approved:
                logger.info("Workflow %s requires human approval, pausing", ctx.run_id)
                await self.emit(ctx, "blocked", {
                    "reason": "hitl_required",
                    "plan": ctx.plan.dict() if ctx.plan else {},
                    "critique": ctx.critique.dict() if ctx.critique else {},
                    "message": "Human approval required before execution"
                })
                ctx.state = "PROPOSED"
                return ctx

            # Phase 4: Execution
            try:
                await self.emit(ctx, "status", {"msg": "executor_start", "phase": "execution"})
                execution_start = time.time()
                
                ctx = await self.executor.run(ctx)
                
                execution_duration = time.time() - execution_start
                logger.info("Execution completed for run %s in %.2fs", ctx.run_id, execution_duration)
                
                if ctx.exec_result:
                    await self.emit(ctx, "result", {
                        **ctx.exec_result.dict() if ctx.exec_result else {},
                        "duration_seconds": execution_duration
                    })
                else:
                    logger.warning("Executor did not produce execution result")
                    await self.emit(ctx, "warning", {
                        "phase": "execution",
                        "message": "Executor completed but did not produce a result"
                    })
                
            except Exception as e:
                logger.error("Execution phase failed for run %s: %s", ctx.run_id, e)
                await self.emit(ctx, "error", {
                    "phase": "execution",
                    "error": str(e),
                    "message": f"Execution failed: {str(e)}"
                })
                # Executor should set state to FAILED, but ensure it's set
                if ctx.state != "FAILED":
                    ctx.state = "FAILED"
                return ctx

            # Workflow completed successfully
            total_duration = time.time() - workflow_start_time
            logger.info("Workflow completed successfully for run %s in %.2fs", ctx.run_id, total_duration)
            
            await self.emit(ctx, "status", {
                "msg": "workflow_complete",
                "duration_seconds": total_duration,
                "state": ctx.state
            })
            
            return ctx

        except Exception as e:
            # Catch-all for unexpected errors
            logger.exception("Unexpected error in workflow for run %s: %s", ctx.run_id, e)
            await self.emit(ctx, "error", {
                "phase": "unknown",
                "error": str(e),
                "message": f"Unexpected workflow error: {str(e)}"
            })
            ctx.state = "FAILED"
            return ctx

