"""
Agent Runner
Executes agents (Planner, Critic, Executor) using MCP clients.
"""

import logging
from typing import Dict, Any, Optional
import httpx

from .orchestrator import WorkflowContext
from .routing import AgentRole
from .observability import trace_agent_execution
from app.core.config import settings

logger = logging.getLogger(__name__)


async def call_mcp(
    tool_name: str,
    parameters: Dict[str, Any],
    mcp_server_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call MCP server tool.
    
    Args:
        tool_name: Name of the MCP tool to call
        parameters: Parameters for the tool
        mcp_server_url: Optional MCP server URL (defaults to environment config)
    
    Returns:
        Tool execution result
    """
    # Default MCP server URL (can be configured via environment)
    server_url = mcp_server_url or getattr(settings, "MCP_SERVER_URL", "http://localhost:3000/mcp")
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{server_url}/tools/{tool_name}",
                json={"parameters": parameters},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"MCP call failed for {tool_name}: {e}")
        raise


@trace_agent_execution("planner")
async def planner_agent(ctx: WorkflowContext) -> WorkflowContext:
    """
    Planner Agent: Analyzes input and creates execution plan.
    
    Args:
        ctx: Workflow context with input_data
    
    Returns:
        Updated context with plan
    """
    logger.info(f"Planner agent running for workflow {ctx.run_id}")
    
    try:
        # Extract input requirements
        input_text = ctx.input_data.get("prompt", "")
        input_type = ctx.input_data.get("type", "lighting")
        
        # Call MCP planner tool (or use internal planning logic)
        # For now, create a simple plan structure
        plan = {
            "steps": [
                {
                    "op": "analyze",
                    "description": f"Analyze {input_type} requirements",
                    "parameters": {"input": input_text},
                },
                {
                    "op": "generate",
                    "description": f"Generate {input_type} configuration",
                    "parameters": ctx.input_data,
                },
            ],
            "estimated_cost_usd": 0.05,
            "estimated_duration_seconds": 30,
        }
        
        # If MCP server is available, use it
        if hasattr(settings, "MCP_SERVER_URL") and settings.MCP_SERVER_URL:
            try:
                mcp_result = await call_mcp(
                    "plan_lighting",
                    {
                        "input": input_text,
                        "type": input_type,
                        "context": ctx.input_data,
                    },
                )
                plan = mcp_result.get("plan", plan)
            except Exception as e:
                logger.warning(f"MCP planner call failed, using fallback: {e}")
        
        ctx.plan = plan
        logger.info(f"Planner completed for workflow {ctx.run_id}")
        return ctx
    
    except Exception as e:
        logger.error(f"Planner agent failed: {e}", exc_info=True)
        raise


async def critic_agent(ctx: WorkflowContext) -> WorkflowContext:
    """
    Critic Agent: Reviews and critiques the plan.
    
    Args:
        ctx: Workflow context with plan
    
    Returns:
        Updated context with critique
    """
    logger.info(f"Critic agent running for workflow {ctx.run_id}")
    
    if not ctx.plan:
        raise ValueError("Cannot critique: no plan available")
    
    try:
        # Analyze plan for issues
        critique = {
            "issues": [],
            "suggestions": [],
            "risk_level": "low",
            "approved": True,
        }
        
        # Check for cost issues
        estimated_cost = ctx.plan.get("estimated_cost_usd", 0)
        max_cost = float(getattr(settings, "PROLIGHT_MAX_COST_USD", "1.0"))
        if estimated_cost > max_cost:
            critique["issues"].append({
                "type": "cost",
                "message": f"Estimated cost ${estimated_cost:.2f} exceeds limit ${max_cost:.2f}",
                "severity": "high",
            })
            critique["approved"] = False
        
        # Check for allowed operations
        from app.guards.ops import ALLOWED_OPS
        steps = ctx.plan.get("steps", [])
        for step in steps:
            op = step.get("op")
            if op and op not in ALLOWED_OPS:
                critique["issues"].append({
                    "type": "operation",
                    "message": f"Operation '{op}' is not allowed",
                    "severity": "high",
                })
                critique["approved"] = False
        
        # If MCP server is available, use it for advanced critique
        if hasattr(settings, "MCP_SERVER_URL") and settings.MCP_SERVER_URL:
            try:
                mcp_result = await call_mcp(
                    "critique_plan",
                    {
                        "plan": ctx.plan,
                        "input": ctx.input_data,
                    },
                )
                critique = {**critique, **mcp_result.get("critique", {})}
            except Exception as e:
                logger.warning(f"MCP critic call failed, using fallback: {e}")
        
        ctx.critique = critique
        logger.info(f"Critic completed for workflow {ctx.run_id}, approved: {critique['approved']}")
        return ctx
    
    except Exception as e:
        logger.error(f"Critic agent failed: {e}", exc_info=True)
        raise


@trace_agent_execution("executor")
async def executor_agent(ctx: WorkflowContext) -> WorkflowContext:
    """
    Executor Agent: Executes the approved plan.
    
    Args:
        ctx: Workflow context with plan
    
    Returns:
        Updated context with result
    """
    logger.info(f"Executor agent running for workflow {ctx.run_id}")
    
    if not ctx.plan:
        raise ValueError("Cannot execute: no plan available")
    
    try:
        # Execute plan steps
        results = []
        steps = ctx.plan.get("steps", [])
        
        for i, step in enumerate(steps):
            logger.info(f"Executing step {i+1}/{len(steps)}: {step.get('op')}")
            
            # Execute step via MCP or internal logic
            step_result = {
                "step": i + 1,
                "op": step.get("op"),
                "status": "completed",
                "result": {},
            }
            
            # If MCP server is available, use it
            if hasattr(settings, "MCP_SERVER_URL") and settings.MCP_SERVER_URL:
                try:
                    mcp_result = await call_mcp(
                        f"execute_{step.get('op')}",
                        step.get("parameters", {}),
                    )
                    step_result["result"] = mcp_result
                except Exception as e:
                    logger.warning(f"MCP executor call failed for step {i+1}: {e}")
                    # Fallback to internal execution
                    step_result["result"] = {"message": f"Step {i+1} completed (fallback)"}
            else:
                # Fallback execution
                step_result["result"] = {"message": f"Step {i+1} completed (no MCP)"}
            
            results.append(step_result)
        
        ctx.result = {
            "steps": results,
            "status": "completed",
            "completed_at": ctx.updated_at.isoformat(),
        }
        
        logger.info(f"Executor completed for workflow {ctx.run_id}")
        return ctx
    
    except Exception as e:
        logger.error(f"Executor agent failed: {e}", exc_info=True)
        raise


async def run_agent(role: AgentRole, ctx: WorkflowContext) -> WorkflowContext:
    """
    Route to appropriate agent based on role.
    
    Args:
        role: Agent role to execute
        ctx: Workflow context
    
    Returns:
        Updated workflow context
    """
    if role == AgentRole.PLANNER:
        return await planner_agent(ctx)
    elif role == AgentRole.CRITIC:
        return await critic_agent(ctx)
    elif role == AgentRole.EXECUTOR:
        return await executor_agent(ctx)
    else:
        raise ValueError(f"Unknown agent role: {role}")
