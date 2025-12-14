"""
Validation and guardrails for agent outputs.
Ensures safety, correctness, and cost constraints are met.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.agents.schemas import Plan, Critique, ExecutionResult

logger = logging.getLogger(__name__)

# Cost limits
MAX_COST_PER_RUN = 10.00  # Maximum cost in USD per workflow run
MAX_STEPS = 50  # Maximum number of steps in a plan
MAX_IMAGE_GENERATIONS = 10  # Maximum number of image generations per run

# Allowed operations
ALLOWED_OPERATIONS = {
    "remove_background",
    "enhance",
    "expand",
    "generate_image"
}

# Required parameters per operation
REQUIRED_PARAMS = {
    "expand": ["direction"],
    "generate_image": ["prompt"]
}

# Cost estimates per operation (in USD)
OPERATION_COSTS = {
    "remove_background": 0.015,
    "enhance": 0.015,
    "expand": 0.04,
    "generate_image": 0.075
}


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def validate_plan(plan: Plan) -> Tuple[bool, List[str]]:
    """
    Validate a plan for safety and correctness.
    
    Returns:
        (is_valid, list_of_issues)
    """
    issues: List[str] = []
    
    # Validate steps count
    if len(plan.steps) == 0:
        issues.append("Plan has no steps")
    elif len(plan.steps) > MAX_STEPS:
        issues.append(f"Plan has too many steps: {len(plan.steps)} > {MAX_STEPS}")
    
    # Validate each step
    image_generation_count = 0
    estimated_cost = 0.0
    
    for i, step in enumerate(plan.steps):
        step_num = i + 1
        
        # Check operation is allowed
        if step.op not in ALLOWED_OPERATIONS:
            issues.append(f"Step {step_num}: Invalid operation '{step.op}'")
            continue
        
        # Check required parameters
        if step.op in REQUIRED_PARAMS:
            for required_param in REQUIRED_PARAMS[step.op]:
                if required_param not in step.params:
                    issues.append(f"Step {step_num}: Missing required parameter '{required_param}' for operation '{step.op}'")
        
        # Count image generations (expensive operations)
        if step.op == "generate_image":
            image_generation_count += 1
            if image_generation_count > MAX_IMAGE_GENERATIONS:
                issues.append(f"Step {step_num}: Too many image generations ({image_generation_count} > {MAX_IMAGE_GENERATIONS})")
        
        # Estimate cost for this step
        estimated_cost += OPERATION_COSTS.get(step.op, 0.02)
    
    # Validate estimated cost
    if plan.estimated_cost_usd is not None:
        if plan.estimated_cost_usd > MAX_COST_PER_RUN:
            issues.append(f"Estimated cost ${plan.estimated_cost_usd:.2f} exceeds maximum ${MAX_COST_PER_RUN:.2f}")
        # Warn if estimated cost differs significantly from calculated
        if estimated_cost > 0 and abs(plan.estimated_cost_usd - estimated_cost) > 0.5:
            issues.append(f"Estimated cost ${plan.estimated_cost_usd:.2f} differs significantly from calculated ${estimated_cost:.2f}")
    
    if estimated_cost > MAX_COST_PER_RUN:
        issues.append(f"Calculated cost ${estimated_cost:.2f} exceeds maximum ${MAX_COST_PER_RUN:.2f}")
    
    # Validate outputs
    if not plan.outputs:
        issues.append("Plan has no expected outputs specified")
    
    # Validate asset_id for operations that need it
    asset_required_ops = {"remove_background", "enhance", "expand"}
    has_asset_required_op = any(step.op in asset_required_ops for step in plan.steps)
    if has_asset_required_op and not plan.asset_id:
        issues.append("Plan contains operations requiring asset_id but asset_id is missing")
    
    is_valid = len(issues) == 0
    return is_valid, issues


def validate_critique(critique: Critique) -> Tuple[bool, List[str]]:
    """
    Validate a critique for correctness.
    
    Returns:
        (is_valid, list_of_issues)
    """
    issues: List[str] = []
    
    # Critique should have ok field
    if not hasattr(critique, 'ok'):
        issues.append("Critique missing 'ok' field")
    
    # If critique says not ok, should have issues
    if hasattr(critique, 'ok') and not critique.ok:
        if not critique.issues or len(critique.issues) == 0:
            issues.append("Critique marked as not ok but has no issues listed")
    
    # Validate cost estimate if present
    if hasattr(critique, 'estimated_cost_usd') and critique.estimated_cost_usd is not None:
        if critique.estimated_cost_usd < 0:
            issues.append(f"Critique has negative cost estimate: ${critique.estimated_cost_usd:.2f}")
        if critique.estimated_cost_usd > MAX_COST_PER_RUN:
            issues.append(f"Critique cost estimate ${critique.estimated_cost_usd:.2f} exceeds maximum ${MAX_COST_PER_RUN:.2f}")
    
    is_valid = len(issues) == 0
    return is_valid, issues


def validate_execution_result(result: ExecutionResult) -> Tuple[bool, List[str]]:
    """
    Validate an execution result.
    
    Returns:
        (is_valid, list_of_issues)
    """
    issues: List[str] = []
    
    # Check success status
    if not result.success:
        if not result.logs:
            issues.append("Execution failed but no logs provided")
        else:
            # Extract error messages from logs
            error_logs = [log for log in result.logs if "FAILED" in log.upper() or "ERROR" in log.upper()]
            if not error_logs:
                issues.append("Execution marked as failed but no error logs found")
    
    # Validate outputs structure
    if not isinstance(result.outputs, dict):
        issues.append("Execution result outputs must be a dictionary")
    else:
        # Check for expected output types
        if "edits" not in result.outputs and "generated" not in result.outputs:
            if result.success:
                issues.append("Successful execution but no outputs (edits or generated) provided")
    
    # Validate logs
    if not result.logs:
        issues.append("Execution result has no logs")
    
    is_valid = len(issues) == 0
    return is_valid, issues


def sanitize_operation_params(op: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize and validate operation parameters.
    
    Returns:
        Sanitized parameters dictionary
    """
    sanitized = {}
    
    if op == "enhance":
        # Ensure enhancement values are in valid range [0, 1]
        for key in ["sharpness", "contrast", "brightness", "saturation", "exposure"]:
            if key in params:
                val = params[key]
                if isinstance(val, (int, float)):
                    sanitized[key] = max(0.0, min(1.0, float(val)))
                else:
                    logger.warning(f"Invalid {key} value type: {type(val)}, ignoring")
    
    elif op == "expand":
        # Validate direction
        if "direction" in params:
            direction = params["direction"]
            valid_directions = ["top", "bottom", "left", "right", "all"]
            if direction in valid_directions:
                sanitized["direction"] = direction
            else:
                logger.warning(f"Invalid expand direction: {direction}, using 'all'")
                sanitized["direction"] = "all"
        
        # Validate ratio
        if "ratio" in params:
            val = params["ratio"]
            if isinstance(val, (int, float)):
                sanitized["ratio"] = max(0.1, min(2.0, float(val)))
            else:
                logger.warning(f"Invalid expand ratio type: {type(val)}, using default 1.0")
                sanitized["ratio"] = 1.0
    
    elif op == "generate_image":
        # Sanitize prompt (remove potentially harmful content, limit length)
        if "prompt" in params:
            prompt = str(params["prompt"]).strip()
            # Limit prompt length
            max_prompt_length = 2000
            if len(prompt) > max_prompt_length:
                logger.warning(f"Prompt too long ({len(prompt)} chars), truncating to {max_prompt_length}")
                prompt = prompt[:max_prompt_length]
            
            if len(prompt) == 0:
                raise ValidationError("generate_image requires non-empty prompt")
            
            sanitized["prompt"] = prompt
    
    # Copy other params as-is
    for key, value in params.items():
        if key not in sanitized:
            sanitized[key] = value
    
    return sanitized
