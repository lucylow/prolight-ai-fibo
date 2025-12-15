"""
Embeddings Service - Generate embeddings for text.
Stub implementation ready for MCP/Anthropic/OpenAI integration.
"""

from typing import List
import numpy as np
import hashlib
import os
import httpx
from app.core.config import settings


# Embedding dimension (OpenAI uses 1536, adjust as needed)
EMBEDDING_DIM = 1536


def get_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for text.
    
    Currently uses a deterministic hash-based stub.
    Replace with actual embedding API call (e.g., OpenAI, Anthropic, Bria MCP).
    
    Args:
        text: Input text to embed
        
    Returns:
        List of float values representing the embedding vector
    """
    # TODO: Replace with actual embedding API
    # Example implementations:
    # 
    # OpenAI:
    #   import openai
    #   response = openai.embeddings.create(model="text-embedding-3-small", input=text)
    #   return response.data[0].embedding
    #
    # Anthropic (if they provide embeddings):
    #   Use their API client
    #
    # Bria MCP:
    #   Use MCP client to call embedding endpoint
    
    # Stub: Generate deterministic pseudo-random vector based on text hash
    # This ensures same text always produces same embedding
    text_bytes = text.encode('utf-8')
    hash_obj = hashlib.sha256(text_bytes)
    seed = int(hash_obj.hexdigest()[:8], 16) % (2**32)
    
    rng = np.random.RandomState(seed)
    embedding = rng.randn(EMBEDDING_DIM).tolist()
    
    # Normalize to unit vector (common practice)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = (np.array(embedding) / norm).tolist()
    
    return embedding


async def get_embedding_async(text: str) -> List[float]:
    """
    Async version of get_embedding.
    
    Args:
        text: Input text to embed
        
    Returns:
        List of float values representing the embedding vector
    """
    # For now, just call sync version
    # When integrating with async API, implement async call here
    return get_embedding(text)

