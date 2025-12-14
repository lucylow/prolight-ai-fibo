"""
Agents API
Endpoints for managing agents.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/agents", tags=["Agents"])


class AgentCreate(BaseModel):
    """Request model for creating an agent."""
    name: str = Field(..., description="Agent name")
    description: str = Field(..., description="Agent description")
    config: Optional[Dict[str, Any]] = Field(None, description="Agent configuration")


class AgentResponse(BaseModel):
    """Response model for agent."""
    id: str
    name: str
    description: str
    config: Optional[Dict[str, Any]] = None
    created_at: str


# In-memory storage (replace with database in production)
_agents_store: Dict[str, Dict[str, Any]] = {}


@router.post("", response_model=AgentResponse)
async def create_agent(agent: AgentCreate):
    """Create a new agent."""
    agent_id = str(uuid.uuid4())
    
    agent_data = {
        "id": agent_id,
        "name": agent.name,
        "description": agent.description,
        "config": agent.config or {},
        "created_at": "2024-01-01T00:00:00Z",  # In production, use actual timestamp
    }
    
    _agents_store[agent_id] = agent_data
    logger.info(f"Created agent: {agent_id} - {agent.name}")
    
    return AgentResponse(**agent_data)


@router.get("", response_model=List[AgentResponse])
async def list_agents():
    """List all agents."""
    return [AgentResponse(**agent) for agent in _agents_store.values()]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get agent by ID."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return AgentResponse(**_agents_store[agent_id])


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    del _agents_store[agent_id]
    logger.info(f"Deleted agent: {agent_id}")
    
    return {"message": "Agent deleted", "id": agent_id}
