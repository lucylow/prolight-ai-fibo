# app/agents/base.py
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from uuid import UUID

@dataclass
class RunContext:
    """Context passed between agents in the workflow."""
    run_id: str
    asset_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    plan: Optional[Any] = None  # Plan object
    critique: Optional[Any] = None  # Critique object
    exec_result: Optional[Any] = None  # ExecutionResult
    state: str = "CREATED"  # CREATED, PLANNED, CRITIQUED, PROPOSED, EXECUTING, COMPLETED, FAILED

class Agent:
    """Base agent class."""
    role: str = "agent"
    
    def __init__(self, mcp_client):
        self.mcp = mcp_client

