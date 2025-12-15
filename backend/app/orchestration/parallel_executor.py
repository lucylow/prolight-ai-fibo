"""
Parallel Agent Execution
Enables parallel execution of independent agent tasks for improved performance.
"""

import logging
import asyncio
from typing import List, Dict, Any, Callable, Awaitable, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class TaskDependency(Enum):
    """Task dependency types."""
    NONE = "none"  # Can run in parallel
    SEQUENTIAL = "sequential"  # Must run after previous
    CONDITIONAL = "conditional"  # Depends on condition


@dataclass
class AgentTask:
    """Represents an agent task that can be executed."""
    id: str
    agent_role: str
    execute: Callable[[], Awaitable[Dict[str, Any]]]
    dependencies: List[str] = None  # Task IDs this depends on
    priority: int = 0  # Higher priority runs first
    timeout: Optional[float] = None
    retryable: bool = True
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


class ParallelExecutor:
    """Executes agent tasks in parallel where possible."""
    
    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def execute_task(
        self,
        task: AgentTask,
        results: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute a single task with dependency checking.
        
        Args:
            task: Task to execute
            results: Dictionary of completed task results
        
        Returns:
            Task execution result
        """
        # Wait for dependencies
        if task.dependencies:
            for dep_id in task.dependencies:
                if dep_id not in results:
                    raise ValueError(f"Task {task.id} depends on {dep_id} which hasn't completed")
        
        async with self.semaphore:
            logger.info(f"Executing task {task.id} ({task.agent_role})")
            
            try:
                if task.timeout:
                    result = await asyncio.wait_for(
                        task.execute(),
                        timeout=task.timeout,
                    )
                else:
                    result = await task.execute()
                
                result["task_id"] = task.id
                result["status"] = "completed"
                logger.info(f"Task {task.id} completed successfully")
                return result
            
            except asyncio.TimeoutError:
                logger.error(f"Task {task.id} timed out after {task.timeout}s")
                return {
                    "task_id": task.id,
                    "status": "timeout",
                    "error": f"Task timed out after {task.timeout}s",
                }
            
            except Exception as e:
                logger.error(f"Task {task.id} failed: {e}", exc_info=True)
                if task.retryable:
                    # Could implement retry logic here
                    pass
                return {
                    "task_id": task.id,
                    "status": "failed",
                    "error": str(e),
                }
    
    async def execute_parallel(
        self,
        tasks: List[AgentTask],
    ) -> Dict[str, Any]:
        """
        Execute tasks in parallel respecting dependencies.
        
        Args:
            tasks: List of tasks to execute
        
        Returns:
            Dictionary mapping task IDs to results
        """
        results: Dict[str, Any] = {}
        completed: set = set()
        pending: Dict[str, AgentTask] = {task.id: task for task in tasks}
        
        # Build dependency graph
        dependency_graph: Dict[str, List[str]] = {
            task.id: task.dependencies for task in tasks
        }
        
        # Find tasks ready to execute (no dependencies or all dependencies completed)
        def get_ready_tasks() -> List[AgentTask]:
            ready = []
            for task in pending.values():
                if task.id in completed:
                    continue
                if all(dep_id in completed for dep_id in task.dependencies):
                    ready.append(task)
            return sorted(ready, key=lambda t: t.priority, reverse=True)
        
        # Execute tasks
        while pending:
            ready_tasks = get_ready_tasks()
            
            if not ready_tasks:
                # Check for circular dependencies or missing dependencies
                remaining = [t.id for t in pending.values() if t.id not in completed]
                if remaining:
                    logger.error(f"Circular dependency or missing dependency detected. Remaining: {remaining}")
                    for task_id in remaining:
                        results[task_id] = {
                            "task_id": task_id,
                            "status": "failed",
                            "error": "Circular or missing dependency",
                        }
                break
            
            # Execute ready tasks in parallel
            task_coroutines = [
                self.execute_task(task, results)
                for task in ready_tasks
            ]
            
            task_results = await asyncio.gather(*task_coroutines, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(task_results):
                if isinstance(result, Exception):
                    task = ready_tasks[i]
                    logger.error(f"Task {task.id} raised exception: {result}")
                    results[task.id] = {
                        "task_id": task.id,
                        "status": "failed",
                        "error": str(result),
                    }
                else:
                    task = ready_tasks[i]
                    results[task.id] = result
                    completed.add(task.id)
                    del pending[task.id]
        
        return results


def identify_parallel_opportunities(plan: Dict[str, Any]) -> List[AgentTask]:
    """
    Analyze a plan and identify tasks that can run in parallel.
    
    Args:
        plan: Execution plan with steps
    
    Returns:
        List of agent tasks with dependency information
    """
    tasks: List[AgentTask] = []
    steps = plan.get("steps", [])
    
    for i, step in enumerate(steps):
        op = step.get("op", "")
        step_id = step.get("id", f"step_{i}")
        
        # Determine dependencies
        dependencies = []
        if i > 0:
            # By default, steps depend on previous step
            # But some operations can be parallelized
            prev_step_id = steps[i-1].get("id", f"step_{i-1}")
            
            # Analysis operations can often run in parallel
            if op in ["analyze", "validate", "check"]:
                # Analysis can run in parallel with other analysis
                pass  # No dependency
            else:
                dependencies.append(prev_step_id)
        
        # Create task
        async def create_executor(step_data: Dict[str, Any], step_idx: int):
            async def execute():
                # This would call the actual agent execution
                logger.info(f"Executing step {step_idx}: {step_data.get('op')}")
                return {
                    "step": step_idx,
                    "op": step_data.get("op"),
                    "result": {"status": "completed"},
                }
            return execute
        
        task = AgentTask(
            id=step_id,
            agent_role="executor",  # Could be determined from step
            execute=await create_executor(step, i) if asyncio.iscoroutinefunction(create_executor) else create_executor(step, i),
            dependencies=dependencies,
            priority=step.get("priority", 0),
            timeout=step.get("timeout"),
        )
        tasks.append(task)
    
    return tasks

