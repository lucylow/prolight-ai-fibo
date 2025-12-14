"""
Server-Sent Events API
Real-time streaming of workflow updates.
"""

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from typing import AsyncGenerator
import asyncio
import logging

from app.core.config import settings
from app.orchestration.orchestrator import _runs_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/runs", tags=["SSE"])


async def event_generator(run_id: str) -> AsyncGenerator[dict, None]:
    """
    Generate SSE events for a run.
    
    Args:
        run_id: Run ID to stream updates for
    
    Yields:
        Event dictionaries
    """
    last_state = None
    last_update = None
    
    while True:
        try:
            # Check if run exists
            if run_id in _runs_store:
                ctx = _runs_store[run_id]
                current_state = ctx.state.value if hasattr(ctx.state, "value") else str(ctx.state)
                current_update = ctx.updated_at.isoformat() if hasattr(ctx, "updated_at") else None
                
                # Only send update if state changed
                if current_state != last_state or current_update != last_update:
                    event_data = {
                        "run_id": run_id,
                        "state": current_state,
                        "plan": ctx.plan,
                        "critique": ctx.critique,
                        "result": ctx.result,
                        "error": ctx.error,
                        "updated_at": current_update,
                    }
                    
                    yield {
                        "event": "status",
                        "data": str(event_data),
                    }
                    
                    last_state = current_state
                    last_update = current_update
                    
                    # If completed or failed, close connection
                    if current_state in ["COMPLETED", "FAILED"]:
                        yield {
                            "event": "complete",
                            "data": f"Run {run_id} finished with state: {current_state}",
                        }
                        break
            else:
                # Run not found
                yield {
                    "event": "error",
                    "data": f"Run {run_id} not found",
                }
                break
            
            # Wait before next check
            await asyncio.sleep(1)
        
        except asyncio.CancelledError:
            logger.info(f"SSE connection cancelled for run {run_id}")
            break
        except Exception as e:
            logger.error(f"Error in SSE stream for run {run_id}: {e}")
            yield {
                "event": "error",
                "data": f"Error: {str(e)}",
            }
            break


@router.get("/{run_id}/stream")
async def stream(run_id: str):
    """Stream workflow updates via Server-Sent Events."""
    return EventSourceResponse(event_generator(run_id))
