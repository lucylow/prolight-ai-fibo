"""
Coordinator that runs routing: Planner → Critic → (HITL) → Executor (Async version)
"""
import logging
from typing import Callable, Awaitable
from app.agents.base import RunContext
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.agents.planner_async import PlannerAgentAsync
from app.agents.critic_async import CriticAgentAsync
from app.agents.executor_async import ExecutorAgentAsync

logger = logging.getLogger("runner_async")


class AgentRunnerAsync:
    def __init__(self, bria_client: BriaMCPClientAsync, event_hook: Callable[[str, dict], Awaitable[None]]):
        self.mcp = bria_client
        self.planner = PlannerAgentAsync(self.mcp)
        self.critic = CriticAgentAsync(self.mcp)
        self.executor = ExecutorAgentAsync(self.mcp)
        self.event_hook = event_hook

    async def emit(self, ctx: RunContext, typ: str, payload: dict):
        try:
            await self.event_hook(ctx.run_id, {"type": typ, "payload": payload})
        except Exception:
            logger.exception("Failed to emit event")

    async def run_workflow(self, ctx: RunContext, human_approved: bool = False) -> RunContext:
        await self.emit(ctx, "status", {"msg": "planner_start"})
        ctx = await self.planner.run(ctx)
        await self.emit(ctx, "plan", ctx.plan.dict() if ctx.plan else {})

        await self.emit(ctx, "status", {"msg": "critic_start"})
        ctx = await self.critic.run(ctx)
        await self.emit(ctx, "critique", ctx.critique.dict() if ctx.critique else {})

        requires_hitl = (ctx.plan and ctx.plan.requires_hitl) or (ctx.critique and not ctx.critique.ok)
        if requires_hitl and not human_approved:
            await self.emit(ctx, "blocked", {"reason": "hitl_required"})
            ctx.state = "PROPOSED"
            return ctx

        await self.emit(ctx, "status", {"msg": "executor_start"})
        ctx = await self.executor.run(ctx)
        await self.emit(ctx, "result", ctx.exec_result.dict() if ctx.exec_result else {})
        return ctx
