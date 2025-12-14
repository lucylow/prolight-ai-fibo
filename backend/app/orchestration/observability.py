"""
Observability and Monitoring
Provides structured logging, metrics, and tracing for agentic workflows.
"""

import logging
import time
from typing import Dict, Any, Optional, Callable
from functools import wraps
from datetime import datetime
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class WorkflowMetrics:
    """Tracks metrics for workflow execution."""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "workflows_started": 0,
            "workflows_completed": 0,
            "workflows_failed": 0,
            "agent_calls": {},
            "average_duration": 0.0,
            "state_transitions": {},
        }
    
    def record_workflow_start(self, workflow_id: str, state: str):
        """Record workflow start."""
        self.metrics["workflows_started"] += 1
        logger.info(
            "workflow_started",
            extra={
                "workflow_id": workflow_id,
                "state": state,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    
    def record_workflow_complete(self, workflow_id: str, duration: float):
        """Record workflow completion."""
        self.metrics["workflows_completed"] += 1
        self._update_average_duration(duration)
        logger.info(
            "workflow_completed",
            extra={
                "workflow_id": workflow_id,
                "duration_seconds": duration,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    
    def record_workflow_failed(self, workflow_id: str, error: str, duration: float):
        """Record workflow failure."""
        self.metrics["workflows_failed"] += 1
        logger.error(
            "workflow_failed",
            extra={
                "workflow_id": workflow_id,
                "error": error,
                "duration_seconds": duration,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    
    def record_agent_call(self, agent_role: str, duration: float, success: bool):
        """Record agent call."""
        if agent_role not in self.metrics["agent_calls"]:
            self.metrics["agent_calls"][agent_role] = {
                "total": 0,
                "success": 0,
                "failed": 0,
                "total_duration": 0.0,
                "average_duration": 0.0,
            }
        
        agent_metrics = self.metrics["agent_calls"][agent_role]
        agent_metrics["total"] += 1
        agent_metrics["total_duration"] += duration
        
        if success:
            agent_metrics["success"] += 1
        else:
            agent_metrics["failed"] += 1
        
        agent_metrics["average_duration"] = agent_metrics["total_duration"] / agent_metrics["total"]
    
    def record_state_transition(self, from_state: str, to_state: str):
        """Record state transition."""
        transition_key = f"{from_state}->{to_state}"
        if transition_key not in self.metrics["state_transitions"]:
            self.metrics["state_transitions"][transition_key] = 0
        self.metrics["state_transitions"][transition_key] += 1
    
    def _update_average_duration(self, duration: float):
        """Update average workflow duration."""
        total = self.metrics["workflows_completed"] + self.metrics["workflows_failed"]
        if total > 0:
            current_avg = self.metrics["average_duration"]
            self.metrics["average_duration"] = (
                (current_avg * (total - 1) + duration) / total
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot."""
        return self.metrics.copy()


# Global metrics instance
_metrics = WorkflowMetrics()


def get_metrics() -> WorkflowMetrics:
    """Get global metrics instance."""
    return _metrics


def trace_agent_execution(agent_role: str):
    """
    Decorator to trace agent execution with timing and error tracking.
    
    Usage:
        @trace_agent_execution("planner")
        async def planner_agent(ctx):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            workflow_id = getattr(args[0], 'run_id', 'unknown') if args else 'unknown'
            
            logger.info(
                f"agent_execution_start",
                extra={
                    "agent_role": agent_role,
                    "workflow_id": workflow_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                _metrics.record_agent_call(agent_role, duration, success=True)
                logger.info(
                    f"agent_execution_complete",
                    extra={
                        "agent_role": agent_role,
                        "workflow_id": workflow_id,
                        "duration_seconds": duration,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                
                return result
            
            except Exception as e:
                duration = time.time() - start_time
                _metrics.record_agent_call(agent_role, duration, success=False)
                logger.error(
                    f"agent_execution_failed",
                    extra={
                        "agent_role": agent_role,
                        "workflow_id": workflow_id,
                        "error": str(e),
                        "duration_seconds": duration,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    exc_info=True,
                )
                raise
        
        return wrapper
    return decorator


@contextmanager
def trace_workflow_operation(operation_name: str, workflow_id: str):
    """
    Context manager for tracing workflow operations.
    
    Usage:
        with trace_workflow_operation("state_transition", workflow_id):
            # operation code
    """
    start_time = time.time()
    logger.info(
        f"workflow_operation_start",
        extra={
            "operation": operation_name,
            "workflow_id": workflow_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    
    try:
        yield
        duration = time.time() - start_time
        logger.info(
            f"workflow_operation_complete",
            extra={
                "operation": operation_name,
                "workflow_id": workflow_id,
                "duration_seconds": duration,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"workflow_operation_failed",
            extra={
                "operation": operation_name,
                "workflow_id": workflow_id,
                "error": str(e),
                "duration_seconds": duration,
                "timestamp": datetime.utcnow().isoformat(),
            },
            exc_info=True,
        )
        raise


def log_structured_event(
    event_type: str,
    workflow_id: str,
    **kwargs
):
    """
    Log structured event with consistent format.
    
    Args:
        event_type: Type of event (e.g., "state_transition", "agent_call")
        workflow_id: Workflow identifier
        **kwargs: Additional event data
    """
    logger.info(
        event_type,
        extra={
            "workflow_id": workflow_id,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs,
        }
    )
