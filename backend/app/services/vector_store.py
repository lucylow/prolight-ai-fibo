"""
Vector Store - Redis-based vector storage for conversation memory and RAG.
"""

import json
import numpy as np
from typing import List, Dict, Optional
import redis.asyncio as aioredis
from app.services.embeddings import get_embedding_async, EMBEDDING_DIM
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
VECTOR_KEYSPACE = "chat:vec"
CONVERSATION_KEYSPACE = "chat:conv"

# Global Redis client (initialized on first use)
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                REDIS_URL,
                decode_responses=False,  # We store binary data
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            await _redis_client.ping()
            logger.info(f"Connected to Redis at {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Vector store features will be limited.")
            # Create a mock client that does nothing
            _redis_client = None
    return _redis_client


async def add_to_memory(conversation_id: str, text: str, metadata: Optional[Dict] = None):
    """
    Add a message to conversation memory with vector embedding.
    
    Args:
        conversation_id: Unique conversation identifier
        text: Message text to store
        metadata: Optional metadata (timestamp, role, etc.)
    """
    try:
        client = await get_redis_client()
        if client is None:
            logger.warning("Redis not available, skipping memory storage")
            return
        
        # Generate embedding
        embedding = await get_embedding_async(text)
        
        # Store in hash: key = conversation_id, field = timestamped text, value = JSON with vector + metadata
        key = f"{VECTOR_KEYSPACE}:{conversation_id}"
        timestamp = int(time.time() * 1000)  # milliseconds
        message_key = f"{timestamp}:{hash(text) % 10000}"
        
        data = {
            "text": text,
            "embedding": embedding,
            "metadata": metadata or {},
        }
        
        await client.hset(key, message_key, json.dumps(data))
        
        # Also store in conversation history (simple list)
        conv_key = f"{CONVERSATION_KEYSPACE}:{conversation_id}"
        await client.lpush(conv_key, json.dumps({"text": text, "metadata": metadata or {}}))
        await client.ltrim(conv_key, 0, 99)  # Keep last 100 messages
        
    except Exception as e:
        logger.error(f"Failed to add to memory: {e}")


async def query_memory(conversation_id: str, query: str, k: int = 5) -> List[Dict]:
    """
    Retrieve similar messages from conversation memory using vector similarity.
    
    Args:
        conversation_id: Conversation identifier
        query: Query text to find similar messages
        k: Number of results to return
        
    Returns:
        List of dictionaries with 'text', 'score', and 'metadata' keys
    """
    try:
        client = await get_redis_client()
        if client is None:
            logger.warning("Redis not available, returning empty results")
            return []
        
        # Generate query embedding
        query_embedding = np.array(await get_embedding_async(query))
        
        # Get all stored messages for this conversation
        key = f"{VECTOR_KEYSPACE}:{conversation_id}"
        items = await client.hgetall(key)
        
        if not items:
            return []
        
        # Compute cosine similarity with all stored vectors
        scored = []
        for msg_key, data_bytes in items.items():
            try:
                data = json.loads(data_bytes)
                stored_embedding = np.array(data.get("embedding", []))
                
                if len(stored_embedding) == len(query_embedding):
                    # Cosine similarity
                    dot_product = np.dot(stored_embedding, query_embedding)
                    norm_product = np.linalg.norm(stored_embedding) * np.linalg.norm(query_embedding)
                    score = dot_product / norm_product if norm_product > 0 else 0.0
                    
                    scored.append({
                        "text": data.get("text", ""),
                        "score": float(score),
                        "metadata": data.get("metadata", {}),
                    })
            except Exception as e:
                logger.warning(f"Error processing stored message: {e}")
                continue
        
        # Sort by score (descending) and return top k
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:k]
        
    except Exception as e:
        logger.error(f"Failed to query memory: {e}")
        return []


async def get_conversation_history(conversation_id: str, limit: int = 20) -> List[Dict]:
    """
    Get recent conversation history (non-vector, simple retrieval).
    
    Args:
        conversation_id: Conversation identifier
        limit: Maximum number of messages to return
        
    Returns:
        List of message dictionaries
    """
    try:
        client = await get_redis_client()
        if client is None:
            return []
        
        conv_key = f"{CONVERSATION_KEYSPACE}:{conversation_id}"
        messages = await client.lrange(conv_key, 0, limit - 1)
        
        return [json.loads(msg) for msg in messages if msg]
        
    except Exception as e:
        logger.error(f"Failed to get conversation history: {e}")
        return []


async def clear_conversation(conversation_id: str):
    """
    Clear all memory for a conversation.
    
    Args:
        conversation_id: Conversation identifier
    """
    try:
        client = await get_redis_client()
        if client is None:
            return
        
        vec_key = f"{VECTOR_KEYSPACE}:{conversation_id}"
        conv_key = f"{CONVERSATION_KEYSPACE}:{conversation_id}"
        
        await client.delete(vec_key, conv_key)
        
    except Exception as e:
        logger.error(f"Failed to clear conversation: {e}")
