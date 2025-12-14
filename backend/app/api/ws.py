"""
WebSocket API
Real-time bidirectional communication for workflow updates.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

from app.core.config import settings
from app.orchestration.orchestrator import _runs_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Store active WebSocket connections per run
_connections: Dict[str, Set[WebSocket]] = {}


def get_connections_for_run(run_id: str) -> Set[WebSocket]:
    """Get all WebSocket connections for a run."""
    return _connections.get(run_id, set())


async def broadcast_run_update(run_id: str, message: dict):
    """
    Broadcast update to all WebSocket connections for a run.
    
    Args:
        run_id: Run ID
        message: Message to broadcast
    """
    connections = get_connections_for_run(run_id)
    if not connections:
        return
    
    message_json = json.dumps(message)
    disconnected = set()
    
    for ws in connections:
        try:
            await ws.send_text(message_json)
        except Exception as e:
            logger.warning(f"Failed to send to WebSocket: {e}")
            disconnected.add(ws)
    
    # Remove disconnected connections
    for ws in disconnected:
        connections.discard(ws)
    
    if not connections and run_id in _connections:
        del _connections[run_id]


@router.websocket("/runs/{run_id}")
async def run_ws(websocket: WebSocket, run_id: str):
    """WebSocket endpoint for run updates."""
    await websocket.accept()
    
    # Add to connections
    if run_id not in _connections:
        _connections[run_id] = set()
    _connections[run_id].add(websocket)
    
    logger.info(f"WebSocket connected for run {run_id}")
    
    try:
        # Send initial state
        if run_id in _runs_store:
            ctx = _runs_store[run_id]
            await websocket.send_json({
                "type": "initial",
                "run_id": run_id,
                "state": ctx.state.value if hasattr(ctx.state, "value") else str(ctx.state),
                "data": ctx.to_dict(),
            })
        
        # Listen for incoming messages (for future bidirectional communication)
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle incoming messages (e.g., pause, resume, cancel)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "cancel":
                    # Cancel workflow (implement cancellation logic)
                    await websocket.send_json({
                        "type": "cancelled",
                        "run_id": run_id,
                    })
                    break
                
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from WebSocket: {data}")
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for run {run_id}")
    except Exception as e:
        logger.error(f"WebSocket error for run {run_id}: {e}", exc_info=True)
    finally:
        # Remove from connections
        if run_id in _connections:
            _connections[run_id].discard(websocket)
            if not _connections[run_id]:
                del _connections[run_id]
