"""
Agent Routing Table
Deterministic routing rules for multi-agent workflow.
"""

from enum import Enum
from typing import Optional, Dict, Any, List


class AgentRole(str, Enum):
    """Agent role types in the workflow."""
    PLANNER = "planner"
    CRITIC = "critic"
    EXECUTOR = "executor"


class WorkflowState(str, Enum):
    """Workflow state enumeration."""
    CREATED = "CREATED"
    PLANNED = "PLANNED"
    CRITIQUED = "CRITIQUED"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Routing table defining state transitions and agent assignments
ROUTING_TABLE: List[Dict[str, Any]] = [
    {
        "from": WorkflowState.CREATED,
        "to": WorkflowState.PLANNED,
        "role": AgentRole.PLANNER,
        "requires_human": False,
    },
    {
        "from": WorkflowState.PLANNED,
        "to": WorkflowState.CRITIQUED,
        "role": AgentRole.CRITIC,
        "requires_human": False,
    },
    {
        "from": WorkflowState.CRITIQUED,
        "to": WorkflowState.APPROVED,
        "role": None,
        "requires_human": True,  # Human-in-the-loop approval
    },
    {
        "from": WorkflowState.APPROVED,
        "to": WorkflowState.EXECUTING,
        "role": AgentRole.EXECUTOR,
        "requires_human": False,
    },
    {
        "from": WorkflowState.EXECUTING,
        "to": WorkflowState.COMPLETED,
        "role": None,
        "requires_human": False,
    },
]


def get_next_state(current_state: WorkflowState) -> Optional[Dict[str, Any]]:
    """Get the next routing rule for a given state."""
    for rule in ROUTING_TABLE:
        if rule["from"] == current_state:
            return rule
    return None


def requires_human_approval(state: WorkflowState) -> bool:
    """Check if a state requires human approval."""
    rule = get_next_state(state)
    return rule.get("requires_human", False) if rule else False

