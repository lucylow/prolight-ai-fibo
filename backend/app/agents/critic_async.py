"""
Critic agent: reviews the plan and can produce suggested changes (Async version)
"""
import logging
import json
import re
from typing import Dict, Any, Optional
from app.agents.base import Agent, RunContext
from app.agents.schemas import Critique
from app.mcp.bria_client_async import BriaMCPClientAsync

logger = logging.getLogger("critic_async")

CRITIC_PROMPT = """You are ProLight's quality assurance critic agent. Your role is to review execution plans for safety, cost-effectiveness, and correctness before execution.

Review the plan carefully and identify:
1. Safety issues (potentially harmful operations, excessive costs)
2. Logical errors (invalid operation sequences, missing dependencies)
3. Cost optimization opportunities
4. Missing or unclear parameters
5. Operations that should require human approval

AVAILABLE OPERATIONS & EXPECTED PARAMS:
- remove_background: params: {} (optional)
- enhance: params: {{"sharpness": 0.0-1.0, "contrast": 0.0-1.0, ...}} (optional)
- expand: params: {{"direction": "top|bottom|left|right|all", "ratio": 0.1-2.0}} (required)
- generate_image: params: {{"prompt": "string"}} (required)

COST GUIDELINES:
- remove_background: ~$0.01-0.02
- enhance: ~$0.01-0.02
- expand: ~$0.03-0.05
- generate_image: ~$0.05-0.10

CRITICISM GUIDELINES:
- Flag plans with estimated_cost_usd > $1.00 as potentially expensive
- Flag missing required parameters
- Suggest optimizations (e.g., combine operations if possible)
- Recommend HITL for expensive or complex operations
- Identify operation sequence issues

OUTPUT FORMAT (JSON ONLY):
{{
  "ok": true/false,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "estimated_cost_usd": 0.15
}}

Plan to review:
{plan}

Remember: Output ONLY valid JSON, no markdown, no explanations."""


class CriticAgentAsync(Agent):
    role = "critic"
    def __init__(self, bria_client: BriaMCPClientAsync):
        super().__init__(bria_client)

    def name(self):
        return "critic_async"

    async def run(self, ctx: RunContext) -> RunContext:
        if not ctx.plan:
            raise RuntimeError("Critic needs a plan")
        
        plan_json_str = ctx.plan.json() if hasattr(ctx.plan, 'json') else json.dumps(ctx.plan.dict() if hasattr(ctx.plan, 'dict') else ctx.plan)
        prompt = CRITIC_PROMPT.format(plan=plan_json_str)
        
        logger.info("Critic (async) reviewing plan for run %s", ctx.run_id)
        
        try:
            raw = await self.mcp._call_mcp_async(prompt)
            
            # Handle both string and dict responses
            if isinstance(raw, dict):
                raw_text = raw.get("content", raw.get("text", json.dumps(raw)))
            else:
                raw_text = str(raw)
            
            # Extract JSON from response
            parsed = self._extract_json_from_response(raw_text)
            
            # Validate and normalize critique
            parsed = self._validate_and_normalize_critique(parsed, ctx.plan)
            
        except Exception as e:
            logger.warning("Critic MCP call failed or parsing failed: %s, using conservative critique", e)
            # Conservative fallback: approve but note issues
            parsed = {
                "ok": True,
                "issues": [f"Critic review unavailable: {str(e)}"],
                "suggestions": ["Manual review recommended"],
                "estimated_cost_usd": ctx.plan.estimated_cost_usd if ctx.plan else None
            }
        
        try:
            critique = Critique(**parsed)
            ctx.critique = critique
            ctx.state = "CRITIQUED"
            logger.info("Critic completed for run %s: ok=%s, issues=%d, suggestions=%d", 
                       ctx.run_id, critique.ok, len(critique.issues or []), len(critique.suggestions or []))
            return ctx
        except Exception as e:
            logger.error("Failed to create Critique object: %s", e)
            # Create minimal valid critique
            critique = Critique(
                ok=True,
                issues=[f"Critique validation failed: {str(e)}"],
                suggestions=[],
                estimated_cost_usd=ctx.plan.estimated_cost_usd if ctx.plan else None
            )
            ctx.critique = critique
            ctx.state = "CRITIQUED"
            return ctx
    
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
    
    def _validate_and_normalize_critique(self, critique_dict: Dict[str, Any], plan) -> Dict[str, Any]:
        """Validate and normalize critique structure."""
        # Ensure ok field exists
        if "ok" not in critique_dict:
            # Auto-determine based on issues
            critique_dict["ok"] = len(critique_dict.get("issues", [])) == 0
        
        # Ensure issues is a list
        if "issues" not in critique_dict or not isinstance(critique_dict["issues"], list):
            critique_dict["issues"] = []
        
        # Ensure suggestions is a list (Critique schema uses "suggestions", not "suggested_changes")
        if "suggestions" not in critique_dict:
            # Check for old field name
            if "suggested_changes" in critique_dict:
                critique_dict["suggestions"] = critique_dict.pop("suggested_changes")
            else:
                critique_dict["suggestions"] = []
        
        if not isinstance(critique_dict["suggestions"], list):
            critique_dict["suggestions"] = []
        
        # Validate cost estimate
        if "estimated_cost_usd" not in critique_dict or not isinstance(critique_dict["estimated_cost_usd"], (int, float)):
            critique_dict["estimated_cost_usd"] = plan.estimated_cost_usd if plan else None
        
        # Additional validation: flag high costs
        if critique_dict.get("estimated_cost_usd", 0) > 1.0 and "High cost operation" not in str(critique_dict.get("issues", [])):
            critique_dict["issues"].append(f"High estimated cost: ${critique_dict['estimated_cost_usd']:.2f}")
            critique_dict["ok"] = False
        
        return critique_dict

