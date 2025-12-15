"""
Prompt Refinement Service - Combines RAG docs and extracted entities into refined prompts.
"""
import logging
from typing import Dict, Any, Optional, List
from app.services.vector_store import get_vector_store
from app.services.embeddings import get_embedding_async

logger = logging.getLogger(__name__)


async def refine_prompt(
    base_prompt: str,
    context: Optional[Dict[str, Any]] = None,
    max_rag_docs: int = 3,
    include_entities: bool = True
) -> str:
    """
    Refine a prompt by injecting RAG documents and extracted entities.
    
    Args:
        base_prompt: Base user prompt
        context: Optional context dict (entities, intent, etc.)
        max_rag_docs: Maximum number of RAG documents to include
        include_entities: Whether to include extracted entities
        
    Returns:
        Refined prompt string
    """
    refined_parts = []
    
    # Add RAG documents if available
    try:
        vector_store = await get_vector_store()
        embedding = await get_embedding_async(base_prompt)
        
        if embedding:
            rag_docs = await vector_store.search(embedding, top_k=max_rag_docs)
            if rag_docs:
                refined_parts.append("## Relevant Context:")
                for i, doc in enumerate(rag_docs, 1):
                    refined_parts.append(f"{i}. {doc['text'][:200]}...")
                refined_parts.append("")
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
    
    # Add extracted entities if available
    if include_entities and context:
        entities = context.get("entities", {})
        if entities:
            refined_parts.append("## Extracted Entities:")
            for key, value in entities.items():
                refined_parts.append(f"- {key}: {value}")
            refined_parts.append("")
    
    # Add intent if available
    if context and context.get("intent"):
        refined_parts.append(f"## Intent: {context['intent']}")
        refined_parts.append("")
    
    # Add base prompt
    refined_parts.append("## User Request:")
    refined_parts.append(base_prompt)
    
    return "\n".join(refined_parts)


async def extract_entities(text: str) -> Dict[str, Any]:
    """
    Extract entities from text (simplified version).
    In production, use NER model or LLM.
    
    Args:
        text: Input text
        
    Returns:
        Dict of extracted entities
    """
    # Simplified entity extraction
    # In production, use spaCy, NER model, or LLM-based extraction
    entities = {}
    
    # Extract common patterns (simplified)
    import re
    
    # Email
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if emails:
        entities["email"] = emails[0]
    
    # URLs
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
    if urls:
        entities["urls"] = urls
    
    # Product mentions (simplified - look for quoted strings or capitalized words)
    # In production, use proper NER
    
    return entities

