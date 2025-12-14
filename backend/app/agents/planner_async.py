"""
Planner agent: reasons without side effects; creates a Plan JSON (Async version)
"""
import logging
import json
import re
from typing import Dict, Any, Optional
from app.agents.base import Agent, RunContext
from app.agents.schemas import Plan, PlanStep
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.mcp.tools_async import BriaToolsAsync
from app.agents.determinism import lock_run_seed

logger = logging.getLogger("planner_async")

PLANNER_PROMPT_TEMPLATE = """You are ProLight's intelligent planning agent, specialized in creating detailed, executable plans for image editing and generation workflows.

Your role is to analyze user requirements and create a structured plan with step-by-step operations. You must reason carefully about:
1. The sequence of operations needed
2. Dependencies between steps
3. Cost estimation for each operation
4. Whether human approval (HITL) is required based on complexity/cost
5. Expected outputs from the workflow

AVAILABLE OPERATIONS:
- remove_background: Remove background from images (cost: ~$0.01-0.02 per image)
- enhance: Enhance image quality, sharpness, contrast (cost: ~$0.01-0.02 per image)
- expand: Expand image canvas with AI inpainting (cost: ~$0.03-0.05 per image)
- generate_image: Generate new images from prompts (cost: ~$0.05-0.10 per image)

PLANNING GUIDELINES:
- Break complex tasks into logical steps
- Consider operation dependencies (e.g., must onboard image before editing)
- Estimate costs conservatively (round up)
- Require HITL (human-in-the-loop) if:
  * Total cost exceeds $0.50
  * Generating multiple images (>3)
  * Complex multi-step edits that could have unexpected results
  * User explicitly requests approval
- Specify expected output formats (e.g., ["png_alpha", "jpg", "png"])

OUTPUT FORMAT (JSON ONLY, no markdown, no explanation):
{{
  "agent": "prolight-planner",
  "asset_id": "{asset_id}",
  "steps": [
    {{
      "op": "operation_name",
      "params": {{"param1": "value1", "param2": 123}}
    }}
  ],
  "estimated_cost_usd": 0.15,
  "outputs": ["png_alpha"],
  "requires_hitl": false
}}

Context:
{context}

Remember: Output ONLY valid JSON, nothing else. No markdown code blocks, no explanations."""


class PlannerAgentAsync(Agent):
    role = "planner"

    def __init__(self, bria_client: BriaMCPClientAsync):
        super().__init__(bria_client)
        self.tools = BriaToolsAsync(bria_client)

    def name(self):
        return "planner_async"

    async def run(self, ctx: RunContext) -> RunContext:
        context = {
            "asset_id": ctx.asset_id,
            "metadata": ctx.metadata,
            "user_intent": ctx.metadata.get("user_intent", "enhance_image") if ctx.metadata else "enhance_image"
        }
        asset_id = ctx.asset_id or "unknown"
        prompt = PLANNER_PROMPT_TEMPLATE.format(
            asset_id=asset_id,
            context=json.dumps(context, indent=2)
        )
        logger.info("Planner (async) starting for run %s, asset_id=%s", ctx.run_id, asset_id)
        
        # Call MCP with prompt - note: this expects a text generation response
        try:
            raw = await self.mcp._call_mcp_async(prompt)
            
            # Handle both string and dict responses
            if isinstance(raw, dict):
                # If MCP returns structured response, try to extract content
                raw_text = raw.get("content", raw.get("text", json.dumps(raw)))
            else:
                raw_text = str(raw)
            
            # Extract JSON from response (handle markdown code blocks, etc.)
            parsed = self._extract_json_from_response(raw_text)
            
            # Validate and normalize the plan
            parsed = self._validate_and_normalize_plan(parsed, ctx.asset_id)
            
        except Exception as e:
            logger.warning("Planner MCP call failed or parsing failed: %s, using fallback plan", e)
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
        
        try:
            plan = Plan(**parsed)
            plan_dict = plan.dict()
            lock_run_seed(plan_dict, seed=123456, model_version="planner-async-v1")
            ctx.plan = Plan(**plan_dict)
            ctx.state = "PLANNED"
            logger.info("Planner completed for run %s: %d steps, cost=$%.2f, hitl=%s", 
                       ctx.run_id, len(ctx.plan.steps), ctx.plan.estimated_cost_usd or 0, ctx.plan.requires_hitl)
            return ctx
        except Exception as e:
            logger.error("Failed to create Plan object: %s", e)
            raise RuntimeError(f"Invalid plan structure: {e}")
    
    def _extract_json_from_response(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response, handling markdown code blocks and extra text."""
        # First, try to find JSON in markdown code blocks
        json_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_block_match:
            return json.loads(json_block_match.group(1))
        
        # Try to find JSON object in text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        
        # If no JSON found, try parsing the whole text
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            raise ValueError(f"Could not extract valid JSON from response: {text[:200]}")
    
    def _validate_and_normalize_plan(self, plan_dict: Dict[str, Any], asset_id: Optional[str]) -> Dict[str, Any]:
        """Validate and normalize plan structure."""
        # Ensure required fields
        if "agent" not in plan_dict:
            plan_dict["agent"] = "prolight-planner"
        
        if "asset_id" not in plan_dict:
            plan_dict["asset_id"] = asset_id
        
        if "steps" not in plan_dict or not isinstance(plan_dict["steps"], list):
            plan_dict["steps"] = []
        
        # Validate steps
        valid_ops = {"remove_background", "enhance", "expand", "generate_image"}
        normalized_steps = []
        for step in plan_dict["steps"]:
            if isinstance(step, dict) and "op" in step:
                if step["op"] in valid_ops:
                    normalized_steps.append({
                        "op": step["op"],
                        "params": step.get("params", {})
                    })
                else:
                    logger.warning("Skipping invalid operation: %s", step.get("op"))
        
        plan_dict["steps"] = normalized_steps
        
        # Validate cost
        if "estimated_cost_usd" not in plan_dict or not isinstance(plan_dict["estimated_cost_usd"], (int, float)):
            # Estimate from steps
            base_cost = 0.02
            cost_per_step = {
                "remove_background": 0.01,
                "enhance": 0.01,
                "expand": 0.03,
                "generate_image": 0.05
            }
            estimated = sum(cost_per_step.get(step.get("op", ""), base_cost) for step in normalized_steps)
            plan_dict["estimated_cost_usd"] = estimated
        
        # Validate outputs
        if "outputs" not in plan_dict or not isinstance(plan_dict["outputs"], list):
            plan_dict["outputs"] = ["png_alpha"] if normalized_steps else []
        
        # Validate HITL flag
        if "requires_hitl" not in plan_dict:
            # Auto-detect if HITL needed
            cost = plan_dict.get("estimated_cost_usd", 0)
            num_steps = len(normalized_steps)
            plan_dict["requires_hitl"] = cost > 0.50 or num_steps > 5
        
        return plan_dict
