"""
Guardrail Decorator
Applies guardrail rules to agent functions.
"""

import logging
from functools import wraps
from typing import Callable, Any

from .errors import GuardrailError

logger = logging.getLogger(__name__)


def guardrail(rule: Callable):
    """
    Decorator to apply a guardrail rule to a function.
    
    Args:
        rule: Guardrail rule function that takes context and raises GuardrailError if violated
    
    Returns:
        Decorated function
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(ctx: Any, *args, **kwargs):
            try:
                # Run guardrail rule
                rule(ctx)
                # Execute function if guardrail passes
                return await fn(ctx, *args, **kwargs)
            except GuardrailError as e:
                logger.warning(f"Guardrail violation in {fn.__name__}: {e.code} - {e.message}")
                # Re-raise to be handled by orchestrator
                raise
            except Exception as e:
                logger.error(f"Unexpected error in guardrail for {fn.__name__}: {e}")
                raise
        
        return wrapper
    return decorator
