"""
Agent Orchestrator - Manages agent state, routing, guardrails, and HITL.
Implements deterministic workflow execution with human-in-the-loop gates.
"""

import hashlib
import logging
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime

from app.core.config import settings
from app.services.mcp_client import get_mcp_client

logger = logging.getLogger(__name__)


class AgentState(str, Enum):
    """Agent workflow states."""
    CREATED = "CREATED"
    REGISTERED = "REGISTERED"
    ANALYZED = "ANALYZED"
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    STOPPED = "STOPPED"


# Allowed operations matrix
ALLOWED_OPS = {
    "image": [
        "remove_background",
        "expand",
        "gen_fill",
        "recolor",
        "enhance",
        "upscale",
        "relight"
    ],
    "video": [
        "upscale",
        "background_remove"
    ]
}

# Operations requiring HITL approval
HITL_REQUIRED_FOR = [
    "gen_fill",
    "expand",
    "video",
    "8k",
    "exr"
]


# Routing table - deterministic state transitions
ROUTING_TABLE = [
    {
        "from": AgentState.ANALYZED,
        "to": AgentState.PROPOSED,
        "agent": "planner-agent",
        "requires_human": False
    },
    {
        "from": AgentState.PROPOSED,
        "to": AgentState.APPROVED,
        "agent": None,
        "requires_human": True
    },
    {
        "from": AgentState.APPROVED,
        "to": AgentState.EXECUTING,
        "agent": "executor-agent",
        "requires_human": False
    },
    {
        "from": AgentState.EXECUTING,
        "to": AgentState.COMPLETED,
        "agent": None,
        "requires_human": False
    }
]


class GuardrailError(Exception):
    """Raised when a guardrail blocks execution."""
    pass


class WorkflowPaused(Exception):
    """Raised when workflow is paused for HITL."""
    pass


def validate_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Input guardrails - validate what enters the system.
    
    Returns:
        Validated input or raises GuardrailError
    """
    # Format validation
    allowed_formats = ["jpg", "jpeg", "png", "webp"]
    if "format" in input_data:
        if input_data["format"].lower() not in allowed_formats:
            raise GuardrailError("UNSUPPORTED_FORMAT")
    
    # Size validation (50MB limit)
    if "size_mb" in input_data and input_data["size_mb"] > 50:
        raise GuardrailError("FILE_TOO_LARGE")
    
    # Moderation check (placeholder - integrate with actual moderation)
    if input_data.get("moderation", {}).get("flagged", False):
        return {"state": "BLOCKED", "reason": "MODERATION"}
    
    return input_data


def validate_proposal(proposal: Dict[str, Any]) -> None:
    """
    Planning guardrails - validate agent proposals.
    
    Raises:
        GuardrailError if proposal violates guardrails
    """
    # Cost validation
    estimated_cost = proposal.get("estimated_cost_usd", 0)
    if estimated_cost > settings.PROLIGHT_MAX_COST_USD:
        raise GuardrailError("COST_LIMIT_EXCEEDED")
    
    # Operation validation
    steps = proposal.get("steps", [])
    for step in steps:
        op = step.get("op")
        if not op:
            continue
        
        # Check if operation is allowed
        asset_type = proposal.get("asset_type", "image")
        if op not in ALLOWED_OPS.get(asset_type, []):
            raise GuardrailError(f"OP_NOT_ALLOWED: {op}")
        
        # Check expand limits
        if op == "expand" and step.get("pixels", 0) > 2048:
            raise GuardrailError("EXPAND_TOO_LARGE")
    
    # HITL requirement check
    requires_hitl = False
    for step in steps:
        op = step.get("op")
        if op in HITL_REQUIRED_FOR:
            requires_hitl = True
            break
    
    # Check for high-cost operations
    if estimated_cost > 0.5:
        requires_hitl = True
    
    proposal["requires_hitl"] = requires_hitl


def lock_determinism(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Lock determinism parameters for reproducibility.
    
    Returns:
        Plan with locked determinism fields
    """
    seed = plan.get("seed", hash(str(plan)) % 1000000)
    prompt_hash = hashlib.sha256(
        str(plan.get("steps", [])).encode()
    ).hexdigest()[:16]
    
    plan["determinism"] = {
        "seed": seed,
        "prompt_hash": prompt_hash,
        "model_version": "bria-edit-v2",
        "locked": True,
        "locked_at": datetime.utcnow().isoformat()
    }
    
    return plan


def enforce_execution_limits(ctx: Dict[str, Any]) -> None:
    """
    Execution guardrails - runtime safety checks.
    
    Raises:
        GuardrailError if limits exceeded
    """
    estimated_cost = ctx.get("estimated_cost_usd", 0)
    max_cost = ctx.get("user", {}).get("max_cost_per_job", settings.PROLIGHT_MAX_COST_USD)
    
    if estimated_cost > max_cost:
        raise GuardrailError("COST_LIMIT_EXCEEDED")
    
    # Check determinism lock
    determinism = ctx.get("determinism", {})
    if not determinism.get("locked", False):
        raise GuardrailError("NON_DETERMINISTIC_RUN")
    
    # Step count limit
    steps = ctx.get("steps", [])
    if len(steps) > 20:
        raise GuardrailError("STEP_COUNT_LIMIT_EXCEEDED")


async def advance_workflow(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Advance workflow to next state based on routing table.
    
    Args:
        ctx: Current workflow context
        
    Returns:
        Updated context with new state
        
    Raises:
        WorkflowPaused: If HITL gate is required
    """
    current_state = AgentState(ctx.get("state", AgentState.CREATED))
    
    # Find routing rule
    rule = None
    for r in ROUTING_TABLE:
        if AgentState(r["from"]) == current_state:
            rule = r
            break
    
    if not rule:
        logger.warning(f"No routing rule for state {current_state}")
        return ctx
    
    # Check HITL requirement
    if rule["requires_human"]:
        if not ctx.get("human_approved", False):
            ctx["state"] = AgentState.PROPOSED.value
            ctx["blocked"] = True
            raise WorkflowPaused("Awaiting human approval")
    
    # Run agent if specified
    if rule["agent"]:
        ctx = await run_agent(rule["agent"], ctx)
    
    # Update state
    ctx["state"] = rule["to"].value
    ctx["state_changed_at"] = datetime.utcnow().isoformat()
    
    return ctx


async def run_agent(agent_name: str, ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a specific agent with the given context.
    
    Args:
        agent_name: Name of agent to run
        ctx: Workflow context
        
    Returns:
        Updated context
    """
    mcp_client = get_mcp_client()
    
    if agent_name == "planner-agent":
        # Planner agent - generates proposal
        prompt = f"""
You are a ProLight AI planner agent.

Given the following context, propose a deterministic plan for image editing:
- Asset ID: {ctx.get('asset_id', 'unknown')}
- Intent: {ctx.get('intent', 'enhance')}
- User requirements: {ctx.get('requirements', {})}

Rules:
- Use only allowed operations: {', '.join(ALLOWED_OPS['image'])}
- Estimate cost in USD
- Output strict JSON with: steps, estimated_cost_usd, outputs, requires_hitl
- No execution, only planning
"""
        try:
            response = await mcp_client.call_mcp(prompt, max_tokens=2048)
            # Parse JSON from response (simplified - in production, use proper JSON extraction)
            import json
            import re
            json_match = re.search(r'\{.*\}', response["content"], re.DOTALL)
            if json_match:
                proposal = json.loads(json_match.group())
                validate_proposal(proposal)
                ctx["proposal"] = proposal
                ctx["estimated_cost_usd"] = proposal.get("estimated_cost_usd", 0)
        except Exception as e:
            logger.error(f"Planner agent error: {e}")
            ctx["error"] = str(e)
    
    elif agent_name == "executor-agent":
        # Executor agent - executes approved plan
        proposal = ctx.get("proposal", {})
        steps = proposal.get("steps", [])
        
        # Lock determinism before execution
        proposal = lock_determinism(proposal)
        ctx["proposal"] = proposal
        
        # Enforce execution limits
        enforce_execution_limits(ctx)
        
        # Execute each step via MCP
        results = []
        for step in steps:
            op = step.get("op")
            prompt = f"""
Execute the following image edit using Bria tools:
Operation: {op}
Parameters: {step}
Asset ID: {ctx.get('asset_id')}

Return job status and result URL.
"""
            try:
                result = await mcp_client.call_mcp(prompt, max_tokens=2048)
                results.append({
                    "step": op,
                    "result": result
                })
            except Exception as e:
                logger.error(f"Executor error for step {op}: {e}")
                results.append({
                    "step": op,
                    "error": str(e)
                })
        
        ctx["execution_results"] = results
    
    return ctx


def create_workflow_context(
    asset_id: str,
    intent: str,
    requirements: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create initial workflow context.
    
    Args:
        asset_id: Asset identifier
        intent: User intent (e.g., "product_packshot_enhancement")
        requirements: Optional requirements dict
        
    Returns:
        Initial workflow context
    """
    return {
        "id": f"workflow_{datetime.utcnow().timestamp()}",
        "asset_id": asset_id,
        "intent": intent,
        "requirements": requirements or {},
        "state": AgentState.CREATED.value,
        "created_at": datetime.utcnow().isoformat(),
        "human_approved": False,
        "blocked": False
    }
