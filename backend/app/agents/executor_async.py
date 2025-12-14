"""
Executor agent: performs operations by calling tools via MCP (Async version)
"""
import logging
from typing import List, Dict, Any
from app.agents.base import Agent, RunContext
from app.agents.schemas import ExecutionResult
from app.mcp.tools_async import BriaToolsAsync
from app.mcp.bria_client_async import BriaMCPClientAsync

logger = logging.getLogger("executor_async")


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
        logs: List[str] = []
        outputs: Dict[str, Any] = {}

        for step in ctx.plan.steps:
            op = step.op
            params = step.params or {}
            logs.append(f"Starting op={op}")
            try:
                if op == "remove_background":
                    res = await self.tools.edit_image(ctx.asset_id, "remove_background", params)
                    outputs.setdefault("edits", []).append(res)
                elif op == "expand":
                    res = await self.tools.edit_image(ctx.asset_id, "expand", params)
                    outputs.setdefault("edits", []).append(res)
                elif op == "enhance":
                    res = await self.tools.edit_image(ctx.asset_id, "enhance", params)
                    outputs.setdefault("edits", []).append(res)
                elif op == "generate_image":
                    res = await self.tools.generate_image(params.get("prompt", ""), params)
                    outputs.setdefault("generated", []).append(res)
                else:
                    logs.append(f"Unknown op {op}; skipping")
            except Exception as e:
                logger.exception("Step failed: %s", e)
                logs.append(f"Step FAILED: {str(e)}")
                ctx.exec_result = ExecutionResult(success=False, outputs=outputs, logs=logs)
                ctx.state = "FAILED"
                return ctx

        ctx.exec_result = ExecutionResult(success=True, outputs=outputs, logs=logs)
        ctx.state = "COMPLETED"
        return ctx
