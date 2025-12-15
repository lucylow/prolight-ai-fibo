"""
Allowed Operations Guardrail
Validates that only permitted operations are executed.
"""

from typing import Any, List

from .errors import GuardrailError


# Allowed operations whitelist
ALLOWED_OPS: List[str] = [
    "remove_background",
    "expand",
    "gen_fill",
    "recolor",
    "enhance",
    "analyze",
    "generate",
    "upscale",
    "adjust_lighting",
    "compose",
]


def allowed_ops(ctx: Any) -> None:
    """
    Check if all operations in plan are allowed.
    
    Args:
        ctx: Workflow context (must have plan with steps)
    
    Raises:
        GuardrailError: If any operation is not allowed
    """
    if not hasattr(ctx, "plan") or not ctx.plan:
        return  # No plan to validate
    
    steps = ctx.plan.get("steps", [])
    for step in steps:
        op = step.get("op")
        if op and op not in ALLOWED_OPS:
            raise GuardrailError(
                "OP_NOT_ALLOWED",
                f"Operation '{op}' is not permitted. Allowed operations: {', '.join(ALLOWED_OPS)}"
            )

