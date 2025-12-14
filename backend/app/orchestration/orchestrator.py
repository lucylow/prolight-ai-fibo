"""
Workflow Orchestrator
Manages state transitions and agent coordination.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from .routing import ROUTING_TABLE, WorkflowState, get_next_state, AgentRole
from .agent_runner import run_agent

logger = logging.getLogger(__name__)


class WorkflowContext:
    """Context object for workflow execution."""
    
    def __init__(
        self,
        state: WorkflowState = WorkflowState.CREATED,
        run_id: Optional[str] = None,
        input_data: Optional[Dict[str, Any]] = None,
        plan: Optional[Dict[str, Any]] = None,
        critique: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.run_id = run_id or str(uuid.uuid4())
        self.state = state
        self.input_data = input_data or {}
        self.plan = plan
        self.critique = critique
        self.result = result
        self.error = error
        self.locked = False
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for serialization."""
        return {
            "run_id": self.run_id,
            "state": self.state.value if isinstance(self.state, WorkflowState) else self.state,
            "input_data": self.input_data,
            "plan": self.plan,
            "critique": self.critique,
            "result": self.result,
            "error": self.error,
            "locked": self.locked,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowContext":
        """Create context from dictionary."""
        ctx = cls(
            run_id=data.get("run_id"),
            input_data=data.get("input_data"),
            plan=data.get("plan"),
            critique=data.get("critique"),
            result=data.get("result"),
            error=data.get("error"),
            metadata=data.get("metadata"),
        )
        ctx.state = WorkflowState(data.get("state", WorkflowState.CREATED.value))
        ctx.locked = data.get("locked", False)
        if "created_at" in data:
            ctx.created_at = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data:
            ctx.updated_at = datetime.fromisoformat(data["updated_at"])
        return ctx


async def advance(
    ctx: WorkflowContext,
    human_approved: bool = False,
    broadcast_update: Optional[callable] = None,
) -> WorkflowContext:
    """
    Advance workflow to next state based on routing table.
    
    Args:
        ctx: Current workflow context
        human_approved: Whether human approval has been granted
        broadcast_update: Optional callback to broadcast state updates
    
    Returns:
        Updated workflow context
    """
    if ctx.locked:
        logger.warning(f"Workflow {ctx.run_id} is locked, cannot advance")
        return ctx
    
    rule = get_next_state(ctx.state)
    if not rule:
        logger.warning(f"No routing rule found for state: {ctx.state}")
        ctx.error = f"No routing rule for state: {ctx.state}"
        ctx.state = WorkflowState.FAILED
        return ctx
    
    # Check if human approval is required
    if rule.get("requires_human") and not human_approved:
        logger.info(f"Workflow {ctx.run_id} waiting for human approval at {ctx.state}")
        if broadcast_update:
            await broadcast_update(ctx.run_id, {
                "state": ctx.state.value,
                "message": "Waiting for human approval",
                "requires_approval": True,
            })
        return ctx
    
    # Lock context during transition
    ctx.locked = True
    ctx.updated_at = datetime.utcnow()
    
    try:
        # Run agent if role is specified
        role = rule.get("role")
        if role:
            logger.info(f"Running {role.value} agent for workflow {ctx.run_id}")
            if broadcast_update:
                await broadcast_update(ctx.run_id, {
                    "state": ctx.state.value,
                    "agent": role.value,
                    "message": f"Running {role.value} agent...",
                })
            
            ctx = await run_agent(role, ctx)
        
        # Transition to next state
        next_state = rule["to"]
        ctx.state = next_state
        ctx.updated_at = datetime.utcnow()
        
        logger.info(f"Workflow {ctx.run_id} advanced from {rule['from'].value} to {next_state.value}")
        
        if broadcast_update:
            await broadcast_update(ctx.run_id, {
                "state": next_state.value,
                "message": f"State transitioned to {next_state.value}",
            })
    
    except Exception as e:
        logger.error(f"Error advancing workflow {ctx.run_id}: {e}", exc_info=True)
        ctx.error = str(e)
        ctx.state = WorkflowState.FAILED
        if broadcast_update:
            await broadcast_update(ctx.run_id, {
                "state": WorkflowState.FAILED.value,
                "error": str(e),
                "message": f"Workflow failed: {e}",
            })
    
    finally:
        ctx.locked = False
    
    return ctx
