"""
Multi-Agent Orchestration System
Planner → Critic → Executor workflow with routing and state management.
"""

from .routing import AgentRole, ROUTING_TABLE
from .orchestrator import WorkflowContext, advance
from .agent_runner import run_agent

__all__ = [
    "AgentRole",
    "ROUTING_TABLE",
    "WorkflowContext",
    "advance",
    "run_agent",
]
