"""
Prompt hashing and caching service for content-addressable cache.
"""
import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.image_generation import PromptCache, Artifact
import logging

logger = logging.getLogger(__name__)


def normalize_prompt_text(prompt: Optional[str]) -> str:
    """Normalize prompt text for consistent hashing."""
    if not prompt:
        return ""
    # Lowercase, strip whitespace, normalize spaces
    return " ".join(prompt.lower().strip().split())


def normalize_fibo_json(fibo_json: Optional[Dict[str, Any]]) -> str:
    """Normalize FIBO JSON for consistent hashing."""
    if not fibo_json:
        return "{}"
    # Sort keys and remove None values for consistency
    normalized = {}
    for key, value in sorted(fibo_json.items()):
        if value is not None:
            if isinstance(value, dict):
                normalized[key] = normalize_fibo_json(value)
            elif isinstance(value, list):
                normalized[key] = sorted(value) if all(isinstance(x, (str, int, float)) for x in value) else value
            else:
                normalized[key] = value
    return json.dumps(normalized, sort_keys=True, separators=(',', ':'))


def compute_prompt_hash(
    prompt_text: Optional[str] = None,
    fibo_json: Optional[Dict[str, Any]] = None,
    model_version: str = "bria-fibo-v1",
    width: int = 1024,
    height: int = 1024,
    seed: Optional[int] = None
) -> str:
    """
    Compute SHA256 hash of normalized prompt parameters.
    
    Args:
        prompt_text: Free text prompt
        fibo_json: Structured FIBO JSON
        model_version: Model version string
        width: Image width
        height: Image height
        seed: Optional seed (if None, hash will match regardless of seed for cache lookup)
        
    Returns:
        SHA256 hex digest
    """
    components = []
    
    # Normalize and add prompt text
    if prompt_text:
        components.append(f"prompt:{normalize_prompt_text(prompt_text)}")
    
    # Normalize and add FIBO JSON
    if fibo_json:
        components.append(f"fibo:{normalize_fibo_json(fibo_json)}")
    
    # Add other parameters
    components.append(f"model:{model_version}")
    components.append(f"size:{width}x{height}")
    
    # Seed is optional - if provided, include it; otherwise hash matches for any seed
    if seed is not None:
        components.append(f"seed:{seed}")
    
    # Compute hash
    combined = "|".join(components)
    hash_obj = hashlib.sha256(combined.encode('utf-8'))
    return hash_obj.hexdigest()


def lookup_cache(
    db: Session,
    prompt_hash: str,
    model_version: str,
    seed: Optional[int] = None,
    width: int = 1024,
    height: int = 1024
) -> Optional[Dict[str, Any]]:
    """
    Look up cached artifact for given prompt hash and parameters.
    
    Args:
        db: Database session
        prompt_hash: Computed prompt hash
        model_version: Model version
        seed: Optional seed
        width: Image width
        height: Image height
        
    Returns:
        Dictionary with artifact metadata if cache hit, None otherwise
    """
    try:
        # Build query conditions
        conditions = [
            PromptCache.prompt_hash == prompt_hash,
            PromptCache.model_version == model_version,
            PromptCache.width == width,
            PromptCache.height == height
        ]
        
        # If seed is provided, match it; otherwise match entries with any seed
        if seed is not None:
            conditions.append(PromptCache.seed == seed)
        
        # Check expiration
        conditions.append(
            (PromptCache.expires_at.is_(None)) | (PromptCache.expires_at > datetime.utcnow())
        )
        
        cache_entry = db.query(PromptCache).filter(and_(*conditions)).first()
        
        if cache_entry:
            # Increment hit count
            cache_entry.hit_count += 1
            db.commit()
            
            # Fetch artifact
            artifact = db.query(Artifact).filter(Artifact.id == cache_entry.artifact_id).first()
            if artifact:
                return {
                    "artifact_id": str(artifact.id),
                    "url": artifact.url,
                    "thumb_url": artifact.thumb_url,
                    "width": artifact.width,
                    "height": artifact.height,
                    "cached_at": cache_entry.created_at.isoformat(),
                    "hit_count": cache_entry.hit_count
                }
    except Exception as e:
        logger.error(f"Cache lookup error: {e}")
    
    return None


def store_cache(
    db: Session,
    prompt_hash: str,
    model_version: str,
    seed: Optional[int],
    width: int,
    height: int,
    artifact_id: str,
    ttl_days: int = 30
) -> PromptCache:
    """
    Store cache entry for prompt hash.
    
    Args:
        db: Database session
        prompt_hash: Computed prompt hash
        model_version: Model version
        seed: Seed used
        width: Image width
        height: Image height
        artifact_id: UUID of cached artifact
        ttl_days: Time to live in days (None for no expiration)
        
    Returns:
        Created PromptCache entry
    """
    expires_at = datetime.utcnow() + timedelta(days=ttl_days) if ttl_days else None
    
    cache_entry = PromptCache(
        prompt_hash=prompt_hash,
        model_version=model_version,
        seed=seed,
        width=width,
        height=height,
        artifact_id=artifact_id,
        expires_at=expires_at
    )
    
    db.add(cache_entry)
    db.commit()
    db.refresh(cache_entry)
    
    return cache_entry

