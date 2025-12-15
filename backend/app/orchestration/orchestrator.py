"""
Workflow Orchestrator
Manages state transitions and agent coordination with enhanced error recovery.
"""

import logging
from typing import Optional, Dict, Any, Callable, List
from datetime import datetime
import uuid

from .routing import ROUTING_TABLE, WorkflowState, get_next_state, AgentRole
from .agent_runner import run_agent
from .retry import retry_with_backoff, RetryConfig, CircuitBreaker
from .observability import trace_workflow_operation, log_structured_event, get_metrics

# Get metrics instance
metrics = get_metrics()

logger = logging.getLogger(__name__)


class WorkflowContext:
    """Context object for workflow execution with enhanced state management."""
    
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
        retry_count: int = 0,
        version: int = 1,
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
        self.retry_count = retry_count
        self.version = version
        self.state_history: List[Dict[str, Any]] = []
        self.checkpoints: Dict[str, Dict[str, Any]] = {}
    
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
            "retry_count": self.retry_count,
            "version": self.version,
            "state_history": self.state_history,
            "checkpoints": self.checkpoints,
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
            retry_count=data.get("retry_count", 0),
            version=data.get("version", 1),
        )
        ctx.state = WorkflowState(data.get("state", WorkflowState.CREATED.value))
        ctx.locked = data.get("locked", False)
        ctx.state_history = data.get("state_history", [])
        ctx.checkpoints = data.get("checkpoints", {})
        if "created_at" in data:
            ctx.created_at = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data:
            ctx.updated_at = datetime.fromisoformat(data["updated_at"])
        return ctx
    
    def create_checkpoint(self, name: str) -> None:
        """Create a checkpoint of current state for recovery."""
        self.checkpoints[name] = {
            "state": self.state.value if isinstance(self.state, WorkflowState) else self.state,
            "plan": self.plan,
            "critique": self.critique,
            "result": self.result,
            "timestamp": datetime.utcnow().isoformat(),
        }
        logger.info(f"Checkpoint '{name}' created for workflow {self.run_id}")
    
    def restore_checkpoint(self, name: str) -> bool:
        """Restore state from checkpoint."""
        if name not in self.checkpoints:
            logger.warning(f"Checkpoint '{name}' not found for workflow {self.run_id}")
            return False
        
        checkpoint = self.checkpoints[name]
        self.state = WorkflowState(checkpoint["state"])
        self.plan = checkpoint.get("plan")
        self.critique = checkpoint.get("critique")
        self.result = checkpoint.get("result")
        logger.info(f"Checkpoint '{name}' restored for workflow {self.run_id}")
        return True


async def advance(
    ctx: WorkflowContext,
    human_approved: bool = False,
    broadcast_update: Optional[Callable] = None,
    retry_config: Optional[RetryConfig] = None,
) -> WorkflowContext:
    """
    Advance workflow to next state based on routing table with enhanced error recovery.
    
    Args:
        ctx: Current workflow context
        human_approved: Whether human approval has been granted
        broadcast_update: Optional callback to broadcast state updates
        retry_config: Optional retry configuration for agent execution
    
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
    
    # Record state transition
    ctx.state_history.append({
        "from": ctx.state.value,
        "to": rule["to"].value,
        "timestamp": ctx.updated_at.isoformat(),
        "retry_count": ctx.retry_count,
    })
    
    # Create checkpoint before agent execution
    checkpoint_name = f"pre_{rule['to'].value}"
    ctx.create_checkpoint(checkpoint_name)
    
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
            
            # Execute agent with retry logic
            retry_config = retry_config or RetryConfig(max_attempts=3)
            ctx = await retry_with_backoff(
                lambda: run_agent(role, ctx),
                config=retry_config,
                operation_name=f"{role.value}_agent",
            )
        
            # Transition to next state
            next_state = rule["to"]
            ctx.state = next_state
            ctx.updated_at = datetime.utcnow()
            ctx.retry_count = 0  # Reset retry count on success
            
            logger.info(f"Workflow {ctx.run_id} advanced from {rule['from'].value} to {next_state.value}")
            
            if broadcast_update:
                await broadcast_update(ctx.run_id, {
                    "state": next_state.value,
                    "message": f"State transitioned to {next_state.value}",
                })
        
        except Exception as e:
            logger.error(f"Error advancing workflow {ctx.run_id}: {e}", exc_info=True)
            ctx.error = str(e)
            ctx.retry_count += 1
            
            # Attempt recovery from checkpoint if retries available
            if ctx.retry_count < (retry_config.max_attempts if retry_config else 3):
                logger.info(f"Attempting recovery for workflow {ctx.run_id} (retry {ctx.retry_count})")
                if ctx.restore_checkpoint(checkpoint_name):
                    ctx.state = WorkflowState(rule["from"].value)  # Revert to previous state
                    ctx.error = None
                else:
                    ctx.state = WorkflowState.FAILED
            else:
                ctx.state = WorkflowState.FAILED
                metrics.record_workflow_failed(ctx.run_id, str(e), 0.0)
            
            if broadcast_update:
                await broadcast_update(ctx.run_id, {
                    "state": ctx.state.value,
                    "error": str(e),
                    "message": f"Workflow failed: {e}",
                    "retry_count": ctx.retry_count,
                })
        
        finally:
            ctx.locked = False
    
    return ctx


