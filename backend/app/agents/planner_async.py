"""
Planner agent: reasons without side effects; creates a Plan JSON (Async version)
"""
import logging
import json
from typing import Dict, Any
from app.agents.base import Agent, RunContext
from app.agents.schemas import Plan, Step
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.mcp.tools_async import BriaToolsAsync
from app.agents.determinism import lock_run_seed

logger = logging.getLogger("planner_async")

PLANNER_PROMPT_TEMPLATE = """
You are ProLight's planning agent. Output EXACT JSON with fields:
- steps: [{op, params}]
- estimated_cost_usd: number
- outputs: [strings]
- requires_hitl: true|false

Context:
{context}
"""


class PlannerAgentAsync(Agent):
    role = "planner"

    def __init__(self, bria_client: BriaMCPClientAsync):
        super().__init__(bria_client)
        self.tools = BriaToolsAsync(bria_client)

    def name(self):
        return "planner_async"

    async def run(self, ctx: RunContext) -> RunContext:
        context = {"asset_id": ctx.asset_id, "metadata": ctx.metadata}
        prompt = PLANNER_PROMPT_TEMPLATE.format(context=json.dumps(context))
        logger.info("Planner (async) prompt for run %s", ctx.run_id)
        # planner may use image_generate or simply ask MCP to propose plan json
        raw = await self.mcp._call_mcp_async(prompt)
        try:
            parsed = json.loads(raw)
        except Exception:
            # fallback conservative plan
            parsed = {
                "agent": "prolight-planner",
                "asset_id": ctx.asset_id,
                "steps": [
                    {"op": "remove_background", "params": {}},
                    {"op": "enhance", "params": {"sharpness": 0.2}}
                ],
                "estimated_cost_usd": 0.05,
                "outputs": ["png_alpha"],
                "requires_hitl": False
            }
        plan = Plan(**parsed)
        plan_dict = plan.dict()
        lock_run_seed(plan_dict, seed=123456, model_version="planner-async-v1")
        ctx.plan = Plan(**plan_dict)
        ctx.state = "PLANNED"
        return ctx
