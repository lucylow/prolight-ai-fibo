"""
Queue Manager for workflow execution.
Handles enqueuing workflow tasks to Redis/Celery or falling back to background tasks.
"""

import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def enqueue_run(queue_name: str, payload: Dict[str, Any], priority: int = 1) -> Optional[str]:
    """
    Enqueue a workflow run to the task queue.
    
    Args:
        queue_name: Queue name (e.g., "workflow")
        payload: Workflow context as dictionary
        priority: Task priority (higher = more important)
    
    Returns:
        Task ID if successfully enqueued, None otherwise
    
    Note:
        Currently falls back to background tasks if Redis/Celery not available.
        In production, this should use Celery or RQ to enqueue tasks.
    """
    try:
        # Check if Redis/Celery is configured
        redis_url = getattr(settings, "REDIS_URL", None)
        if not redis_url or redis_url == "redis://localhost:6379/0":
            # Redis not configured or using default (might not be running)
            logger.debug(f"Redis not configured, skipping queue for {payload.get('run_id')}")
            return None
        
        # TODO: Implement actual Celery/RQ enqueue here
        # Example for Celery:
        # from app.worker import celery_app
        # task = celery_app.send_task('app.tasks.workflow_task', args=[payload], queue=queue_name, priority=priority)
        # return task.id
        
        # For now, just log and return None to trigger background task fallback
        logger.info(f"Queue enqueue not fully implemented, payload: {payload.get('run_id')}")
        return None
        
    except Exception as e:
        logger.warning(f"Failed to enqueue task: {e}")
        return None
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
