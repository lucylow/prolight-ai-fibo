"""
Guardrails for agent plans and execution.
Validates plan JSON for safety, cost limits, and allowed operations.
"""
import os
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Allowed operations whitelist
ALLOWED_OPS = {
    "image_onboard",
    "remove_background",
    "relight",
    "generate_aovs",
    "export",
    "generate_image",
    "image_edit",
    "image_generate",
    "video_edit",
    "product_shot_edit",
    "ads_generate",
    "expand",
    "enhance",
    "upscale",
    "color_correction",
    "noise_reduction",
    "generative_fill",
    "crop",
    "mask",
}

# Maximum cost per plan (USD)
MAX_COST_USD = float(os.getenv("MAX_PLAN_COST_USD", "50.0"))

# Maximum number of AOV exports per plan
MAX_AOV_EXPORTS = int(os.getenv("MAX_AOV_EXPORTS", "10"))

# Maximum number of steps per plan
MAX_STEPS = int(os.getenv("MAX_PLAN_STEPS", "20"))


class GuardrailError(Exception):
    """Raised when guardrail validation fails."""
    def __init__(self, reason: str, details: Optional[Dict[str, Any]] = None):
        self.reason = reason
        self.details = details or {}
        super().__init__(self.reason)


def validate_plan(plan: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate a plan JSON against guardrails.
    
    Args:
        plan: Plan dictionary with steps, estimated_cost_usd, etc.
        
    Returns:
        Tuple of (is_valid, reason)
    """
    if not isinstance(plan, dict):
        return False, "plan must be a dictionary"
    
    # Validate steps
    steps = plan.get("steps", [])
    if not isinstance(steps, list):
        return False, "plan.steps must be a list"
    
    if len(steps) > MAX_STEPS:
        return False, f"plan exceeds maximum steps ({MAX_STEPS})"
    
    if len(steps) == 0:
        return False, "plan must have at least one step"
    
    # Validate operations
    aov_export_count = 0
    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            return False, f"step {i} must be a dictionary"
        
        op = step.get("op")
        if not op:
            return False, f"step {i} missing 'op' field"
        
        if op not in ALLOWED_OPS:
            return False, f"step {i}: disallowed operation '{op}' (not in whitelist)"
        
        # Count AOV exports
        if op == "generate_aovs" or step.get("generate_aovs", False):
            aov_export_count += 1
    
    # Check AOV export limit
    if aov_export_count > MAX_AOV_EXPORTS:
        return False, f"plan exceeds maximum AOV exports ({MAX_AOV_EXPORTS})"
    
    # Validate cost
    estimated_cost = plan.get("estimated_cost_usd", 0.0)
    try:
        estimated_cost = float(estimated_cost)
    except (ValueError, TypeError):
        return False, "estimated_cost_usd must be a number"
    
    if estimated_cost > MAX_COST_USD:
        return False, f"plan cost (${estimated_cost:.2f}) exceeds configured MAX_PLAN_COST_USD (${MAX_COST_USD:.2f})"
    
    # Validate plan structure
    if "intent" not in plan:
        return False, "plan missing 'intent' field"
    
    return True, ""


def validate_plan_with_exception(plan: Dict[str, Any]) -> None:
    """
    Validate plan and raise GuardrailError if invalid.
    
    Args:
        plan: Plan dictionary
        
    Raises:
        GuardrailError: If validation fails
    """
    is_valid, reason = validate_plan(plan)
    if not is_valid:
        raise GuardrailError(reason, {"plan": plan})


def validate_plan_override(plan_override: Dict[str, Any], original_plan: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate a plan override (admin-approved plan modification).
    Plan overrides must still pass guardrails but may bypass some checks.
    
    Args:
        plan_override: Override plan dictionary
        original_plan: Original plan for comparison
        
    Returns:
        Tuple of (is_valid, reason)
    """
    # Basic validation still applies
    is_valid, reason = validate_plan(plan_override)
    if not is_valid:
        return False, f"plan_override validation failed: {reason}"
    
    # Additional checks for overrides
    # Override cost can be higher but still has a cap
    override_cost = plan_override.get("estimated_cost_usd", 0.0)
    override_max_cost = MAX_COST_USD * 2.0  # Allow 2x for admin overrides
    
    try:
        override_cost = float(override_cost)
        if override_cost > override_max_cost:
            return False, f"plan_override cost (${override_cost:.2f}) exceeds override limit (${override_max_cost:.2f})"
    except (ValueError, TypeError):
        return False, "plan_override.estimated_cost_usd must be a number"
    
    return True, ""


def sanitize_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize plan by removing invalid fields and normalizing structure.
    
    Args:
        plan: Plan dictionary
        
    Returns:
        Sanitized plan dictionary
    """
    sanitized = {
        "intent": plan.get("intent", "unknown"),
        "steps": [],
        "estimated_cost_usd": float(plan.get("estimated_cost_usd", 0.0)),
    }
    
    # Copy valid steps
    for step in plan.get("steps", []):
        if isinstance(step, dict) and step.get("op") in ALLOWED_OPS:
            sanitized_step = {
                "op": step["op"],
                "parameters": step.get("parameters", {}),
            }
            if "step_id" in step:
                sanitized_step["step_id"] = step["step_id"]
            if "depends_on" in step:
                sanitized_step["depends_on"] = step["depends_on"]
            sanitized["steps"].append(sanitized_step)
    
    return sanitized

