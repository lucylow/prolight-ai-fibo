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
from app.api.runs import _runs_store

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
                    import json
                    
                    # Send log event for state changes
                    state_messages = {
                        "CREATED": "Workflow created",
                        "PLANNED": "Planning completed",
                        "CRITIQUED": "Critique completed - awaiting approval",
                        "APPROVED": "Approved - ready for execution",
                        "EXECUTING": "Executing workflow",
                        "COMPLETED": "Workflow completed successfully",
                        "FAILED": f"Workflow failed: {ctx.error or 'Unknown error'}",
                        "STOPPED": "Workflow stopped",
                    }
                    
                    log_message = state_messages.get(current_state, f"State: {current_state}")
                    
                    # Send log event
                    log_event = {
                        "type": "log",
                        "data": {
                            "message": log_message
                        }
                    }
                    yield {
                        "event": "message",
                        "data": json.dumps(log_event),
                    }
                    
                    # Frontend expects: {type: "status", data: {status: "...", message: "..."}}
                    event_payload = {
                        "type": "status",
                        "data": {
                            "status": current_state.lower(),
                            "message": log_message,
                            "run_id": run_id,
                            "plan": ctx.plan,
                            "critique": ctx.critique,
                            "result": ctx.result,
                            "error": ctx.error,
                        }
                    }
                    
                    # Also check for proposal/plan to send proposal event for HITL
                    if ctx.plan and current_state in ["CRITIQUED", "PROPOSED"]:
                        # Transform plan to Proposal format expected by frontend
                        plan_dict = ctx.plan if isinstance(ctx.plan, dict) else {}
                        proposal = {
                            "agent": ctx.metadata.get("agent_id", "unknown"),
                            "intent": plan_dict.get("intent", ctx.input_data.get("intent", "enhance")),
                            "steps": plan_dict.get("steps", []),
                            "estimated_cost_usd": plan_dict.get("estimated_cost_usd", 0.0),
                            "outputs": plan_dict.get("outputs", []),
                            "determinism": plan_dict.get("determinism", {
                                "seed": 0,
                                "prompt_hash": "",
                                "model_version": "bria-edit-2025.1"
                            }),
                            "risk_flags": plan_dict.get("risk_flags", []),
                            "request_id": ctx.run_id,
                            "timestamp": ctx.updated_at.isoformat(),
                        }
                        
                        # Send proposal event for HITL - frontend expects proposal in data.proposal
                        proposal_event = {
                            "type": "proposal",
                            "data": {
                                "proposal": proposal
                            }
                        }
                        yield {
                            "event": "message",
                            "data": json.dumps(proposal_event),
                        }
                    
                    yield {
                        "event": "message",
                        "data": json.dumps(event_payload),
                    }
                    
                    last_state = current_state
                    last_update = current_update
                    
                    # If completed or failed, close connection
                    if current_state in ["COMPLETED", "FAILED"]:
                        complete_event = {
                            "type": "status",
                            "data": {
                                "status": current_state.lower(),
                                "message": f"Run {run_id} finished with state: {current_state}",
                            }
                        }
                        yield {
                            "event": "message",
                            "data": json.dumps(complete_event),
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


