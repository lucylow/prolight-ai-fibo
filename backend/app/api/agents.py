"""
Agents API
Endpoints for managing agents.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/agents", tags=["Agents"])


class AgentCreate(BaseModel):
    """Request model for creating an agent."""
    name: str = Field(..., description="Agent name")
    description: str = Field(..., description="Agent description")
    systemPrompt: Optional[str] = Field("", description="System prompt for the agent")
    steps: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Agent steps")
    tools: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Agent tools")
    config: Optional[Dict[str, Any]] = Field(None, description="Agent configuration")


class AgentResponse(BaseModel):
    """Response model for agent."""
    id: str
    name: str
    description: str
    systemPrompt: Optional[str] = ""
    steps: Optional[List[Dict[str, Any]]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    config: Optional[Dict[str, Any]] = None
    created_at: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# In-memory storage (replace with database in production)
_agents_store: Dict[str, Dict[str, Any]] = {}


@router.post("", response_model=AgentResponse)
async def create_agent(agent: AgentCreate):
    """Create a new agent."""
    agent_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    
    agent_data = {
        "id": agent_id,
        "name": agent.name,
        "description": agent.description,
        "systemPrompt": agent.systemPrompt or "",
        "steps": agent.steps or [],
        "tools": agent.tools or [],
        "config": agent.config or {},
        "createdAt": now,
        "created_at": now,  # Legacy field
        "updatedAt": now,
    }
    
    _agents_store[agent_id] = agent_data
    logger.info(f"Created agent: {agent_id} - {agent.name}")
    
    return AgentResponse(
        id=agent_data["id"],
        name=agent_data["name"],
        description=agent_data["description"],
        systemPrompt=agent_data["systemPrompt"],
        steps=agent_data["steps"],
        tools=agent_data["tools"],
        config=agent_data["config"],
        created_at=agent_data["created_at"],
        createdAt=agent_data["createdAt"],
        updatedAt=agent_data["updatedAt"],
    )


@router.get("", response_model=List[AgentResponse])
async def list_agents():
    """List all agents."""
    results = []
    for agent in _agents_store.values():
        # Ensure all fields are present for frontend compatibility
        agent_data = {
            "id": agent.get("id"),
            "name": agent.get("name"),
            "description": agent.get("description"),
            "systemPrompt": agent.get("systemPrompt", ""),
            "steps": agent.get("steps", []),
            "tools": agent.get("tools", []),
            "config": agent.get("config", {}),
            "createdAt": agent.get("createdAt") or agent.get("created_at"),
            "created_at": agent.get("created_at") or agent.get("createdAt"),
            "updatedAt": agent.get("updatedAt"),
        }
        # Create response with all fields
        response = AgentResponse(
            id=agent_data["id"],
            name=agent_data["name"],
            description=agent_data["description"],
            systemPrompt=agent_data["systemPrompt"],
            steps=agent_data["steps"],
            tools=agent_data["tools"],
            config=agent_data["config"],
            created_at=agent_data["created_at"],
            createdAt=agent_data["createdAt"],
            updatedAt=agent_data["updatedAt"],
        )
        results.append(response)
    return results


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get agent by ID."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = _agents_store[agent_id]
    # Ensure all fields are present
    return AgentResponse(
        id=agent["id"],
        name=agent["name"],
        description=agent["description"],
        systemPrompt=agent.get("systemPrompt", ""),
        steps=agent.get("steps", []),
        tools=agent.get("tools", []),
        config=agent.get("config", {}),
        created_at=agent.get("created_at") or agent.get("createdAt"),
        createdAt=agent.get("createdAt") or agent.get("created_at"),
        updatedAt=agent.get("updatedAt"),
    )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent_update: Dict[str, Any]):
    """Update an agent. Accepts full agent object or partial update."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = _agents_store[agent_id]
    
    # Handle both AgentUpdate model and raw dict (for frontend compatibility)
    if isinstance(agent_update, dict):
        update_dict = agent_update
    else:
        update_dict = agent_update.dict(exclude_unset=True) if hasattr(agent_update, 'dict') else {}
    
    # Update fields (allow updating all fields from frontend)
    for key, value in update_dict.items():
        if key != "id":  # Don't allow ID changes
            agent_data[key] = value
    
    agent_data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    _agents_store[agent_id] = agent_data
    
    # Ensure all required fields are present
    logger.info(f"Updated agent: {agent_id}")
    return AgentResponse(
        id=agent_data["id"],
        name=agent_data["name"],
        description=agent_data["description"],
        systemPrompt=agent_data.get("systemPrompt", ""),
        steps=agent_data.get("steps", []),
        tools=agent_data.get("tools", []),
        config=agent_data.get("config", {}),
        created_at=agent_data.get("created_at") or agent_data.get("createdAt"),
        createdAt=agent_data.get("createdAt") or agent_data.get("created_at"),
        updatedAt=agent_data.get("updatedAt"),
    )


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    del _agents_store[agent_id]
    logger.info(f"Deleted agent: {agent_id}")
    
    return {"message": "Agent deleted", "id": agent_id}


# Import runs module for workflow execution
from app.api.runs import run_workflow, _runs_store as runs_store
from app.orchestration.orchestrator import WorkflowContext, WorkflowState
from app.orchestration.queue_manager import enqueue_run


@router.post("/{agent_id}/run")
async def run_agent(agent_id: str, background: BackgroundTasks, input_data: Optional[Dict[str, Any]] = None):
    """Start a workflow run for an agent."""
    if agent_id not in _agents_store:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create workflow context
    ctx = WorkflowContext(
        state=WorkflowState.CREATED,
        input_data=input_data or {},
        metadata={"agent_id": agent_id, "priority": 1},
    )
    
    runs_store[ctx.run_id] = ctx
    
    # Enqueue to Redis queue if available, otherwise run in background
    try:
        if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
            enqueue_run("workflow", ctx.to_dict(), priority=1)
            logger.info(f"Enqueued workflow {ctx.run_id} to Redis queue")
        else:
            background.add_task(run_workflow, ctx)
            logger.info(f"Started workflow {ctx.run_id} in background")
    except Exception as e:
        logger.warning(f"Failed to enqueue, running in background: {e}")
        background.add_task(run_workflow, ctx)
    
    return {"runId": ctx.run_id}  # Frontend expects runId, not run_id


