"""
Runs API
Endpoints for managing workflow runs.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging

from app.orchestration.orchestrator import WorkflowContext, advance, WorkflowState
from app.core.config import settings
from app.orchestration.queue_manager import enqueue_run

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/runs", tags=["Runs"])


class RunCreate(BaseModel):
    """Request model for creating a run."""
    agent_id: str = Field(..., description="Agent ID to run")
    input_data: Dict[str, Any] = Field(..., description="Input data for the workflow")
    priority: int = Field(1, description="Run priority (higher = more important)")


class RunResponse(BaseModel):
    """Response model for run."""
    run_id: str
    agent_id: str
    state: str
    created_at: str


class RunDetailResponse(BaseModel):
    """Detailed response model for run."""
    run_id: str
    agent_id: str
    state: str
    input_data: Dict[str, Any]
    plan: Optional[Dict[str, Any]] = None
    critique: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class RunApproveRequest(BaseModel):
    """Request model for approving a run."""
    approved: bool = Field(True, description="Whether to approve the run")
    plan_override: Optional[Dict[str, Any]] = Field(None, description="Optional plan override (admin only)")


# In-memory storage (replace with database/Redis in production)
_runs_store: Dict[str, WorkflowContext] = {}


async def run_workflow(ctx: WorkflowContext):
    """Background task to run workflow."""
    try:
        logger.info(f"Starting workflow {ctx.run_id}")
        _runs_store[ctx.run_id] = ctx
        
        # Planner
        logger.info(f"Workflow {ctx.run_id}: Running planner agent")
        ctx = await advance(ctx)
        _runs_store[ctx.run_id] = ctx
        logger.info(f"Workflow {ctx.run_id}: Planner completed, state: {ctx.state}")
        
        # Critic
        logger.info(f"Workflow {ctx.run_id}: Running critic agent")
        ctx = await advance(ctx)
        _runs_store[ctx.run_id] = ctx
        logger.info(f"Workflow {ctx.run_id}: Critic completed, state: {ctx.state}")
        
        # Pause here for HITL - workflow will wait for approval
        if ctx.state == WorkflowState.CRITIQUED:
            logger.info(f"Workflow {ctx.run_id} waiting for human approval")
            _runs_store[ctx.run_id] = ctx
            return
        
        # Once human approves:
        logger.info(f"Workflow {ctx.run_id}: Human approved, proceeding to execution")
        ctx = await advance(ctx, human_approved=True)
        _runs_store[ctx.run_id] = ctx
        
        # Execute
        logger.info(f"Workflow {ctx.run_id}: Running executor agent")
        ctx = await advance(ctx)
        _runs_store[ctx.run_id] = ctx
        
        logger.info(f"Workflow {ctx.run_id} completed with state: {ctx.state}")
    
    except Exception as e:
        logger.error(f"Workflow {ctx.run_id} failed: {e}", exc_info=True)
        ctx.error = str(e)
        ctx.state = WorkflowState.FAILED
        _runs_store[ctx.run_id] = ctx


@router.post("/{agent_id}/run", response_model=RunResponse)
async def start_run(agent_id: str, run_data: RunCreate, background: BackgroundTasks):
    """Start a new workflow run."""
    # Create workflow context
    ctx = WorkflowContext(
        state=WorkflowState.CREATED,
        input_data=run_data.input_data,
        metadata={"agent_id": agent_id, "priority": run_data.priority},
    )
    
    _runs_store[ctx.run_id] = ctx
    
    # Enqueue to Redis queue if available, otherwise run in background
    try:
        if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
            enqueue_run("workflow", ctx.to_dict(), priority=run_data.priority)
            logger.info(f"Enqueued workflow {ctx.run_id} to Redis queue")
        else:
            background.add_task(run_workflow, ctx)
            logger.info(f"Started workflow {ctx.run_id} in background")
    except Exception as e:
        logger.warning(f"Failed to enqueue, running in background: {e}")
        background.add_task(run_workflow, ctx)
    
    # Return runId for frontend compatibility
    return {
        "runId": ctx.run_id,  # Frontend expects runId
        "run_id": ctx.run_id,  # Also include run_id for consistency
        "agent_id": agent_id,
        "state": ctx.state.value,
        "created_at": ctx.created_at.isoformat(),
    }


@router.get("/{run_id}/status")
async def get_run_status(run_id: str):
    """Get run status (lightweight endpoint)."""
    if run_id not in _runs_store:
        raise HTTPException(status_code=404, detail="Run not found")
    
    ctx = _runs_store[run_id]
    return {
        "run_id": ctx.run_id,
        "state": ctx.state.value if isinstance(ctx.state, WorkflowState) else ctx.state,
        "status": ctx.state.value.lower() if isinstance(ctx.state, WorkflowState) else str(ctx.state).lower(),
        "error": ctx.error,
        "updated_at": ctx.updated_at.isoformat(),
    }


@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(run_id: str):
    """Get run details."""
    if run_id not in _runs_store:
        raise HTTPException(status_code=404, detail="Run not found")
    
    ctx = _runs_store[run_id]
    return RunDetailResponse(
        run_id=ctx.run_id,
        agent_id=ctx.metadata.get("agent_id", "unknown"),
        state=ctx.state.value if isinstance(ctx.state, WorkflowState) else ctx.state,
        input_data=ctx.input_data,
        plan=ctx.plan,
        critique=ctx.critique,
        result=ctx.result,
        error=ctx.error,
        created_at=ctx.created_at.isoformat(),
        updated_at=ctx.updated_at.isoformat(),
    )


@router.post("/{run_id}/approve")
async def approve_run(run_id: str, approval: RunApproveRequest):
    """
    Approve a run (human-in-the-loop).
    Supports plan_override for admin edits (must pass guardrails).
    """
    from app.services.guardrails import validate_plan_override, GuardrailError
    from app.auth.dependencies import require_admin
    
    if run_id not in _runs_store:
        raise HTTPException(status_code=404, detail="Run not found")
    
    ctx = _runs_store[run_id]
    
    if ctx.state != WorkflowState.CRITIQUED:
        raise HTTPException(
            status_code=400,
            detail=f"Run is in state {ctx.state}, cannot approve. Must be in CRITIQUED state."
        )
    
    # If plan_override is provided, validate it (admin only)
    if approval.plan_override:
        try:
            # TODO: Add admin check here - for now, allow if plan_override is provided
            # In production: admin = await require_admin()
            original_plan = ctx.plan if ctx.plan else {}
            is_valid, reason = validate_plan_override(approval.plan_override, original_plan)
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"plan_override validation failed: {reason}"
                )
            # Apply plan override
            ctx.plan = approval.plan_override
            logger.info(f"Applied plan_override to run {run_id}")
        except GuardrailError as e:
            raise HTTPException(
                status_code=400,
                detail=f"plan_override guardrail failed: {e.reason}"
            )
    
    # Advance workflow with approval
    ctx = await advance(ctx, human_approved=approval.approved)
    _runs_store[run_id] = ctx
    
    return {
        "run_id": run_id,
        "state": ctx.state.value,
        "approved": approval.approved,
        "plan_override_applied": approval.plan_override is not None,
    }


@router.post("/{run_id}/stop")
async def stop_run(run_id: str):
    """Stop a running workflow."""
    if run_id not in _runs_store:
        raise HTTPException(status_code=404, detail="Run not found")
    
    ctx = _runs_store[run_id]
    ctx.state = WorkflowState.STOPPED
    _runs_store[run_id] = ctx
    
    logger.info(f"Stopped run: {run_id}")
    return {
        "run_id": run_id,
        "state": "STOPPED",
        "message": "Run stopped successfully",
    }


