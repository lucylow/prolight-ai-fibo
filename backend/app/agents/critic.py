"""
Critic Agent - Reviews plans and outputs for quality, safety, and cost.
Can trigger HITL (Human In The Loop) when needed.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class CriticAsync:
    """
    Critic agent that reviews plans and execution results.
    Checks for cost, safety, quality, and triggers HITL when needed.
    """
    
    def __init__(self, llm_client=None):
        """
        Initialize critic.
        
        Args:
            llm_client: Optional LLM client for critique generation
        """
        self.llm_client = llm_client
    
    async def critique_plan(
        self,
        plan: Dict[str, Any],
        constraints: Optional[Dict[str, Any]] = None,
        tenant_quota: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Critique a plan before execution.
        
        Args:
            plan: Plan from planner
            constraints: User constraints
            tenant_quota: Tenant quota/limits
            
        Returns:
            Dict with critique:
            {
                "approved": bool,
                "requires_hitl": bool,
                "issues": [...],
                "suggestions": [...],
                "estimated_cost_usd": float
            }
        """
        logger.info("Critiquing plan")
        
        issues = []
        suggestions = []
        requires_hitl = False
        approved = True
        
        # Check cost limits
        estimated_cost = plan.get("estimated_cost_usd", 0.0)
        max_cost = constraints.get("max_cost_usd") if constraints else None
        
        if max_cost and estimated_cost > max_cost:
            issues.append(f"Estimated cost ${estimated_cost:.2f} exceeds limit ${max_cost:.2f}")
            approved = False
        
        # Check tenant quota
        if tenant_quota:
            monthly_limit = tenant_quota.get("monthly_limit_usd")
            monthly_used = tenant_quota.get("monthly_used_usd", 0.0)
            
            if monthly_limit and (monthly_used + estimated_cost) > monthly_limit:
                issues.append(f"Estimated cost would exceed monthly quota")
                approved = False
                requires_hitl = True
        
        # Check for HITL triggers
        steps = plan.get("steps", [])
        for step in steps:
            op = step.get("op")
            params = step.get("params", {})
            
            # HITL triggers
            if op == "video_edit" and params.get("operation") == "upscale":
                # 8K upscale requires HITL
                if params.get("resolution") == "8K":
                    requires_hitl = True
                    issues.append("8K video upscale requires human approval")
            
            if op == "image_edit" and params.get("operation") == "expand":
                # Large expansions require HITL
                if params.get("target_size", 0) > 2048:
                    requires_hitl = True
                    issues.append("Large image expansion requires human approval")
            
            if op == "image_generate" and params.get("num_results", 1) > 50:
                # Large batch generation requires HITL
                requires_hitl = True
                issues.append("Large batch generation requires human approval")
        
        # Brand safety check (can be enhanced with LLM)
        # For now, just check for obvious issues
        
        if not approved and not requires_hitl:
            suggestions.append("Review cost constraints or reduce operation scope")
        
        return {
            "approved": approved and not requires_hitl,
            "requires_hitl": requires_hitl,
            "issues": issues,
            "suggestions": suggestions,
            "estimated_cost_usd": estimated_cost,
            "critique_at": None  # Will be set by runner
        }
    
    async def critique_output(
        self,
        step_result: Dict[str, Any],
        step_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Critique execution output for quality.
        
        Args:
            step_result: Result from executor step
            step_plan: Original step plan
            
        Returns:
            Dict with critique:
            {
                "approved": bool,
                "quality_score": float (0-1),
                "issues": [...],
                "suggestions": [...]
            }
        """
        logger.info("Critiquing output")
        
        issues = []
        quality_score = 1.0
        
        # Check for errors
        if not step_result.get("success", False):
            issues.append(f"Step failed: {step_result.get('error', 'Unknown error')}")
            quality_score = 0.0
        
        # Check output quality (can be enhanced with image quality metrics)
        # For now, just check if result exists
        if step_result.get("success") and not step_result.get("result_url") and not step_result.get("images"):
            issues.append("Step completed but no output generated")
            quality_score = 0.5
        
        return {
            "approved": len(issues) == 0,
            "quality_score": quality_score,
            "issues": issues,
            "suggestions": [],
            "critique_at": None  # Will be set by runner
        }
