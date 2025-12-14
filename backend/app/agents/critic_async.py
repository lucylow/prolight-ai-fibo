"""
Critic agent: reviews the plan and can produce suggested changes (Async version)
"""
import logging
import json
from app.agents.base import Agent, RunContext
from app.agents.schemas import Critique
from app.mcp.bria_client_async import BriaMCPClientAsync

logger = logging.getLogger("critic_async")

CRITIC_PROMPT = """
You are a ProLight critic. Review the plan JSON and return JSON:
{{ "ok": true/false, "issues": [...], "suggested_changes": plan_or_null }}

Plan:
{plan}
"""


class CriticAgentAsync(Agent):
    role = "critic"
    def __init__(self, bria_client: BriaMCPClientAsync):
        super().__init__(bria_client)

    def name(self):
        return "critic_async"

    async def run(self, ctx: RunContext) -> RunContext:
        if not ctx.plan:
            raise RuntimeError("Critic needs a plan")
        prompt = CRITIC_PROMPT.format(plan=ctx.plan.json())
        raw = await self.mcp._call_mcp_async(prompt)
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"ok": True, "issues": [], "suggested_changes": None}
        critique = Critique(**parsed)
        ctx.critique = critique
        ctx.state = "CRITIQUED"
        return ctx
