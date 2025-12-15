"""
Cost Limit Guardrail
Prevents operations that exceed cost thresholds.
"""

import os
from typing import Any, Dict

from .errors import GuardrailError
from app.core.config import settings


def cost_limit(ctx: Any) -> None:
    """
    Check if estimated cost exceeds limit.
    
    Args:
        ctx: Workflow context (must have plan with estimated_cost_usd)
    
    Raises:
        GuardrailError: If cost limit is exceeded
    """
    # Get cost limit from settings or environment
    max_cost = float(getattr(settings, "PROLIGHT_MAX_COST_USD", os.getenv("PROLIGHT_MAX_COST_USD", "1.0")))
    
    # Check plan cost if available
    if hasattr(ctx, "plan") and ctx.plan:
        estimated_cost = ctx.plan.get("estimated_cost_usd", 0)
        if estimated_cost > max_cost:
            raise GuardrailError(
                "COST_LIMIT_EXCEEDED",
                f"Estimated cost ${estimated_cost:.2f} exceeds permitted limit ${max_cost:.2f}"
            )
    
    # Check input data cost if available
    if hasattr(ctx, "input_data") and ctx.input_data:
        input_cost = ctx.input_data.get("estimated_cost_usd", 0)
        if input_cost > max_cost:
            raise GuardrailError(
                "COST_LIMIT_EXCEEDED",
                f"Input cost ${input_cost:.2f} exceeds permitted limit ${max_cost:.2f}"
            )

