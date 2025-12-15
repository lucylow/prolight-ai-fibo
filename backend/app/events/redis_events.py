"""
Redis Event System - Pub/sub for run events and SSE streaming.
"""

import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
EVENTS_DB = 1  # Use separate DB for events

# Global Redis client
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_events_client() -> aioredis.Redis:
    """Get or create Redis client for events."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                REDIS_URL.replace("/0", f"/{EVENTS_DB}"),
                decode_responses=True
            )
            await _redis_client.ping()
            logger.info(f"Connected to Redis events at {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis events connection failed: {e}")
            _redis_client = None
    return _redis_client


async def publish_run_event(run_id: str, event: Dict[str, Any]):
    """
    Publish event to run channel.
    
    Args:
        run_id: Run ID
        event: Event payload
    """
    client = await get_redis_events_client()
    if not client:
        logger.warning("Redis not available, skipping event publish")
        return
    
    try:
        channel = f"run:{run_id}"
        event_json = json.dumps(event)
        
        # Publish to channel
        await client.publish(channel, event_json)
        
        # Also store in list for replay
        list_key = f"run:{run_id}:events"
        await client.lpush(list_key, event_json)
        await client.ltrim(list_key, 0, 999)  # Keep last 1000 events
        
        logger.debug(f"Published event to {channel}: {event.get('type')}")
    except Exception as e:
        logger.error(f"Failed to publish event: {e}")


async def subscribe_run_events(run_id: str) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Subscribe to run events (for SSE).
    
    Args:
        run_id: Run ID
        
    Yields:
        Event dicts
    """
    client = await get_redis_events_client()
    if not client:
        logger.warning("Redis not available, cannot subscribe to events")
        return
    
    try:
        channel = f"run:{run_id}"
        pubsub = client.pubsub()
        await pubsub.subscribe(channel)
        
        # Send historical events first
        list_key = f"run:{run_id}:events"
        historical = await client.lrange(list_key, 0, -1)
        for event_json in reversed(historical):  # Oldest first
            try:
                event = json.loads(event_json)
                yield event
            except json.JSONDecodeError:
                continue
        
        # Stream new events
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    event = json.loads(message["data"])
                    yield event
                except json.JSONDecodeError:
                    continue
    
    except Exception as e:
        logger.error(f"Failed to subscribe to events: {e}")
    finally:
        if pubsub:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


async def get_run_events(run_id: str, limit: int = 100) -> list[Dict[str, Any]]:
    """
    Get historical events for a run.
    
    Args:
        run_id: Run ID
        limit: Maximum number of events to return
        
    Returns:
        List of event dicts
    """
    client = await get_redis_events_client()
    if not client:
        return []
    
    try:
        list_key = f"run:{run_id}:events"
        events_json = await client.lrange(list_key, 0, limit - 1)
        events = []
        for event_json in reversed(events_json):  # Oldest first
            try:
                events.append(json.loads(event_json))
            except json.JSONDecodeError:
                continue
        return events
    except Exception as e:
        logger.error(f"Failed to get events: {e}")
        return []

