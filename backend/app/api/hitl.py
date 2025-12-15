"""
HITL (Human-in-the-Loop) API
Endpoints for managing human approval decisions.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/hitl", tags=["HITL"])


class HITLDecisionRequest(BaseModel):
    """Request model for HITL decision."""
    request_id: str = Field(..., description="Request ID")
    agent: str = Field(..., description="Agent name")
    human: str = Field(..., description="Human user ID")
    decision: str = Field(..., description="Decision: approved, rejected, or modified")
    timestamp: Optional[str] = Field(None, description="Decision timestamp (ISO format)")
    reason: Optional[str] = Field(None, description="Reason for decision")
    modified_proposal: Optional[Dict[str, Any]] = Field(None, description="Modified proposal if decision is modified")


class HITLDecisionResponse(BaseModel):
    """Response model for HITL decision."""
    id: str
    request_id: str
    agent: str
    human: str
    decision: str
    timestamp: str
    reason: Optional[str] = None
    modified_proposal: Optional[Dict[str, Any]] = None


# In-memory storage (replace with database in production)
_decisions_store: Dict[str, Dict[str, Any]] = {}


@router.post("/decisions", response_model=HITLDecisionResponse)
async def create_decision(decision: HITLDecisionRequest):
    """Log a HITL decision."""
    import uuid
    
    decision_id = str(uuid.uuid4())
    timestamp = decision.timestamp or datetime.utcnow().isoformat() + "Z"
    
    decision_data = {
        "id": decision_id,
        "request_id": decision.request_id,
        "agent": decision.agent,
        "human": decision.human,
        "decision": decision.decision,
        "timestamp": timestamp,
        "reason": decision.reason,
        "modified_proposal": decision.modified_proposal,
    }
    
    _decisions_store[decision_id] = decision_data
    logger.info(f"HITL decision logged: {decision_id} - {decision.decision} for {decision.request_id}")
    
    return HITLDecisionResponse(**decision_data)


@router.get("/decisions", response_model=list[HITLDecisionResponse])
async def list_decisions(limit: int = 100):
    """List HITL decisions."""
    decisions = list(_decisions_store.values())
    # Sort by timestamp descending
    decisions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return [HITLDecisionResponse(**d) for d in decisions[:limit]]


@router.get("/decisions/{decision_id}", response_model=HITLDecisionResponse)
async def get_decision(decision_id: str):
    """Get a specific HITL decision."""
    if decision_id not in _decisions_store:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    return HITLDecisionResponse(**_decisions_store[decision_id])

