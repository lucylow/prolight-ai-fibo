# app/agents/schemas.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class PlanStep(BaseModel):
    op: str
    params: Dict[str, Any] = {}

class Plan(BaseModel):
    agent: str
    asset_id: Optional[str] = None
    steps: List[PlanStep] = []
    estimated_cost_usd: Optional[float] = None
    outputs: List[str] = []
    requires_hitl: bool = False

class Critique(BaseModel):
    ok: bool
    issues: List[str] = []
    suggestions: List[str] = []
    estimated_cost_usd: Optional[float] = None

class ExecutionResult(BaseModel):
    success: bool
    outputs: Dict[str, Any] = {}
    logs: List[str] = []
