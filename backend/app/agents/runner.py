"""
Agent Runner - Orchestrates Planner → Critic → Executor workflow.
"""

import logging
import uuid
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from app.agents.planner import PlannerAsync
from app.agents.critic import CriticAsync
from app.agents.executor import ExecutorAsync
from app.models.agentic_workflow import RunState

logger = logging.getLogger(__name__)


class RunContext:
    """Context for a workflow run."""
    
    def __init__(self, run_id: str, tenant_id: str, intent: str, **kwargs):
        self.run_id = run_id
        self.tenant_id = tenant_id
        self.intent = intent
        self.input_asset_urls = kwargs.get("input_asset_urls", [])
        self.constraints = kwargs.get("constraints", {})
        self.state = RunState.CREATED
        self.plan = None
        self.critique = None
        self.exec_results = []
        self.metadata = kwargs.get("metadata", {})
        self.error_message = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dict."""
        return {
            "run_id": self.run_id,
            "tenant_id": self.tenant_id,
            "intent": self.intent,
            "input_asset_urls": self.input_asset_urls,
            "constraints": self.constraints,
            "state": self.state.value,
            "plan": self.plan,
            "critique": self.critique,
            "exec_results": self.exec_results,
            "metadata": self.metadata,
            "error_message": self.error_message
        }


class AgentRunnerAsync:
    """
    Agent runner that orchestrates the workflow.
    """
    
    def __init__(
        self,
        planner: PlannerAsync,
        critic: CriticAsync,
        executor: ExecutorAsync,
        event_hook: Optional[Callable] = None
    ):
        """
        Initialize agent runner.
        
        Args:
            planner: Planner agent
            critic: Critic agent
            executor: Executor agent
            event_hook: Optional event publishing callback
        """
        self.planner = planner
        self.critic = critic
        self.executor = executor
        self.event_hook = event_hook
    
    async def run_workflow(self, ctx: RunContext) -> RunContext:
        """
        Run the complete workflow: Planner → Critic → Executor.
        
        Args:
            ctx: Run context
            
        Returns:
            Updated context
        """
        try:
            # Phase 1: Planning
            ctx.state = RunState.PLANNING
            await self._publish_event("plan", "Planning workflow", {"state": ctx.state.value})
            
            ctx.plan = await self.planner.plan(
                intent=ctx.intent,
                input_asset_urls=ctx.input_asset_urls,
                constraints=ctx.constraints
            )
            
            ctx.state = RunState.PLANNED
            await self._publish_event("plan", "Plan created", {"plan": ctx.plan})
            
            # Phase 2: Critique
            ctx.state = RunState.CRITIQUING
            await self._publish_event("critique", "Reviewing plan", {"state": ctx.state.value})
            
            # Get tenant quota (would come from DB in real implementation)
            tenant_quota = ctx.metadata.get("tenant_quota", {})
            
            ctx.critique = await self.critic.critique_plan(
                plan=ctx.plan,
                constraints=ctx.constraints,
                tenant_quota=tenant_quota
            )
            
            ctx.critique["critique_at"] = datetime.utcnow().isoformat()
            
            # Check if HITL is required
            if ctx.critique.get("requires_hitl", False):
                ctx.state = RunState.PROPOSED
                await self._publish_event(
                    "blocked",
                    "Human approval required",
                    {
                        "state": ctx.state.value,
                        "critique": ctx.critique,
                        "reason": "HITL required"
                    }
                )
                return ctx  # Stop here, wait for approval
            
            # Check if plan is approved
            if not ctx.critique.get("approved", False):
                ctx.state = RunState.FAILED
                ctx.error_message = "; ".join(ctx.critique.get("issues", []))
                await self._publish_event(
                    "error",
                    "Plan not approved",
                    {
                        "state": ctx.state.value,
                        "critique": ctx.critique,
                        "error": ctx.error_message
                    }
                )
                return ctx
            
            await self._publish_event("critique", "Plan approved", {"critique": ctx.critique})
            
            # Phase 3: Execution
            ctx.state = RunState.EXECUTING
            await self._publish_event("status", "Starting execution", {"state": ctx.state.value})
            
            # Execute steps sequentially (respecting dependencies)
            steps = ctx.plan.get("steps", [])
            step_results = {}
            
            for step in steps:
                step_id = step.get("step_id")
                
                # Check dependencies
                depends_on = step.get("depends_on", [])
                if depends_on:
                    # Wait for dependencies (in real implementation, could be parallel)
                    for dep_id in depends_on:
                        if dep_id not in step_results:
                            raise ValueError(f"Dependency {dep_id} not found")
                
                # Execute step
                result = await self.executor.execute_step(
                    step=step,
                    context={
                        "previous_results": step_results,
                        "run_context": ctx.to_dict()
                    }
                )
                
                step_results[step_id] = result
                ctx.exec_results.append(result)
                
                # Critique output
                output_critique = await self.critic.critique_output(
                    step_result=result,
                    step_plan=step
                )
                
                if not output_critique.get("approved", False):
                    logger.warning(f"Step {step_id} output critique failed: {output_critique.get('issues')}")
                    # Continue execution but log issue
                
                # If async operation, schedule status poll
                if result.get("success") and result.get("result", {}).get("request_id"):
                    # In real implementation, would enqueue status_poll job
                    logger.info(f"Async operation {step_id} requires status polling")
            
            # Mark as completed
            ctx.state = RunState.COMPLETED
            await self._publish_event(
                "completed",
                "Workflow completed",
                {
                    "state": ctx.state.value,
                    "results": ctx.exec_results
                }
            )
            
            return ctx
        
        except Exception as e:
            logger.error(f"Workflow failed: {e}", exc_info=True)
            ctx.state = RunState.FAILED
            ctx.error_message = str(e)
            await self._publish_event(
                "error",
                f"Workflow failed: {str(e)}",
                {
                    "state": ctx.state.value,
                    "error": str(e)
                }
            )
            return ctx
    
    async def _publish_event(self, event_type: str, message: str, payload: Dict[str, Any]):
        """Publish event via hook."""
        if self.event_hook:
            await self.event_hook({
                "type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "message": message,
                "payload": payload
            })
