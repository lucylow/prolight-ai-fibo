"""
Vector Store Service - Redis FT (Redis Stack) with fallback to JSON storage.
Provides RAG (Retrieval Augmented Generation) capabilities.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
import hashlib

logger = logging.getLogger(__name__)

# Try to import Redis
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis.asyncio not available, using JSON fallback")

# Try to import Redis Stack (for vector search)
try:
    # Redis Stack provides FT.SEARCH for vector search
    # Check if Redis Stack is available by trying to create an index
    REDIS_STACK_AVAILABLE = False  # Will be determined at runtime
except ImportError:
    REDIS_STACK_AVAILABLE = False


class VectorStore:
    """
    Vector store with Redis FT fallback to JSON storage.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client: Optional[aioredis.Redis] = None
        self.use_redis = REDIS_AVAILABLE
        self.use_redis_stack = False
        
        # JSON fallback storage (in-memory, could be persisted to file)
        self._json_store: Dict[str, Dict[str, Any]] = {}
    
    async def _get_redis_client(self) -> Optional[aioredis.Redis]:
        """Get or create Redis client."""
        if not self.use_redis:
            return None
        
        if self.redis_client is None:
            try:
                self.redis_client = aioredis.from_url(
                    self.redis_url,
                    decode_responses=True
                )
                await self.redis_client.ping()
                
                # Check if Redis Stack is available (has FT commands)
                try:
                    # Try to run FT.INFO to check if Redis Stack is available
                    # This is a simple check - in production, you'd check for specific modules
                    info = await self.redis_client.info("modules")
                    if "search" in str(info).lower() or "ft" in str(info).lower():
                        self.use_redis_stack = True
                        logger.info("Redis Stack detected, using FT.SEARCH for vector search")
                    else:
                        logger.info("Redis available but Redis Stack not detected, using hash storage")
                except Exception:
                    logger.info("Redis available but Redis Stack not detected, using hash storage")
                
                logger.info(f"Connected to Redis at {self.redis_url}")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}, using JSON fallback")
                self.use_redis = False
                self.redis_client = None
        
        return self.redis_client
    
    async def add_document(
        self,
        doc_id: str,
        text: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Add a document to the vector store.
        
        Args:
            doc_id: Document ID
            text: Document text
            embedding: Optional embedding vector
            metadata: Optional metadata
            
        Returns:
            True if successful
        """
        doc_data = {
            "text": text,
            "embedding": embedding,
            "metadata": metadata or {},
        }
        
        # Try Redis first
        client = await self._get_redis_client()
        if client and self.use_redis_stack:
            try:
                # Use Redis Stack FT for vector search
                # Store as hash with embedding
                key = f"doc:{doc_id}"
                await client.hset(key, mapping={
                    "text": text,
                    "embedding": json.dumps(embedding) if embedding else "",
                    "metadata": json.dumps(metadata or {}),
                })
                logger.debug(f"Stored document {doc_id} in Redis Stack")
                return True
            except Exception as e:
                logger.warning(f"Failed to store in Redis Stack: {e}, falling back")
        
        if client:
            # Use Redis hash storage (fallback)
            try:
                key = f"doc:{doc_id}"
                await client.hset(key, mapping={
                    "text": text,
                    "embedding": json.dumps(embedding) if embedding else "",
                    "metadata": json.dumps(metadata or {}),
                })
                logger.debug(f"Stored document {doc_id} in Redis hash")
                return True
            except Exception as e:
                logger.warning(f"Failed to store in Redis: {e}, using JSON fallback")
        
        # JSON fallback
        self._json_store[doc_id] = doc_data
        logger.debug(f"Stored document {doc_id} in JSON fallback")
        return True
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity.
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_metadata: Optional metadata filters
            
        Returns:
            List of document dicts with text, metadata, and similarity score
        """
        # Try Redis Stack FT.SEARCH first
        client = await self._get_redis_client()
        if client and self.use_redis_stack:
            try:
                # Use FT.SEARCH for vector similarity search
                # This is a simplified version - full implementation would use proper FT.SEARCH syntax
                results = []
                # In production, you'd use: FT.SEARCH idx:docs "@embedding:[VECTOR_RANGE ...]"
                # For now, fall back to hash-based search
                logger.debug("Redis Stack FT.SEARCH not fully implemented, using hash search")
            except Exception as e:
                logger.warning(f"Redis Stack search failed: {e}, falling back")
        
        # Hash-based or JSON fallback search
        results = []
        
        if client:
            # Search Redis hashes
            try:
                keys = await client.keys("doc:*")
                for key in keys:
                    doc_data = await client.hgetall(key)
                    if doc_data:
                        embedding_str = doc_data.get("embedding", "")
                        if embedding_str:
                            try:
                                embedding = json.loads(embedding_str)
                                # Simple cosine similarity (in production, use proper vector similarity)
                                similarity = self._cosine_similarity(query_embedding, embedding)
                                results.append({
                                    "doc_id": key.replace("doc:", ""),
                                    "text": doc_data.get("text", ""),
                                    "metadata": json.loads(doc_data.get("metadata", "{}")),
                                    "similarity": similarity,
                                })
                            except Exception:
                                continue
            except Exception as e:
                logger.warning(f"Redis hash search failed: {e}, using JSON fallback")
        
        # JSON fallback search
        if not results:
            for doc_id, doc_data in self._json_store.items():
                if doc_data.get("embedding"):
                    similarity = self._cosine_similarity(query_embedding, doc_data["embedding"])
                    results.append({
                        "doc_id": doc_id,
                        "text": doc_data.get("text", ""),
                        "metadata": doc_data.get("metadata", {}),
                        "similarity": similarity,
                    })
        
        # Sort by similarity and return top_k
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    async def delete_document(self, doc_id: str) -> bool:
        """Delete a document from the store."""
        client = await self._get_redis_client()
        if client:
            try:
                await client.delete(f"doc:{doc_id}")
                return True
            except Exception as e:
                logger.warning(f"Failed to delete from Redis: {e}")
        
        # JSON fallback
        if doc_id in self._json_store:
            del self._json_store[doc_id]
            return True
        
        return False
    
    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None


# Global instance
_vector_store: Optional[VectorStore] = None


async def get_vector_store() -> VectorStore:
    """Get or create global vector store instance."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store

