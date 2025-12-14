"""
Prompt Templates - Centralized prompt templates for LLM interactions.
"""

from typing import List, Dict


# ============================================================================
# System Prompts
# ============================================================================

SYSTEM_BASE = """You are ProLight AI assistant, an expert in professional lighting, image editing, and visual content creation.

Your expertise includes:
- Lighting analysis and optimization
- Image editing and enhancement
- Relighting and exposure adjustment
- Asset generation and composition
- Product photography and professional shots

Be concise, helpful, and professional. When users ask about lighting or image editing, provide actionable advice."""


# ============================================================================
# Chat Templates
# ============================================================================

TEMPLATE_CHAT = """{system_prompt}

CONVERSATION HISTORY:
{context}

USER: {user_message}

ASSISTANT:"""


TEMPLATE_RAG = """{system_prompt}

RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:
{retrieved_docs}

CURRENT CONVERSATION:
{context}

USER: {user_message}

ASSISTANT:"""


TEMPLATE_INTENT = """{system_prompt}

Analyze the user message and identify:
1. Intent: What the user wants to do
2. Entities: Key parameters or values mentioned

Respond with ONLY valid JSON in this format:
{{"intent": "...", "entities": {{"key": "value"}}}}

User message: "{user_message}"

JSON:"""


# ============================================================================
# Helper Functions
# ============================================================================

def format_chat_prompt(
    user_message: str,
    context: str = "",
    system_prompt: str = SYSTEM_BASE,
    use_rag: bool = False,
    retrieved_docs: str = ""
) -> str:
    """
    Format a chat prompt with context.
    
    Args:
        user_message: Current user message
        context: Conversation history
        system_prompt: System instructions
        use_rag: Whether to include retrieved documents
        retrieved_docs: Retrieved relevant documents
        
    Returns:
        Formatted prompt string
    """
    if use_rag and retrieved_docs:
        return TEMPLATE_RAG.format(
            system_prompt=system_prompt,
            retrieved_docs=retrieved_docs,
            context=context or "No previous messages in this conversation.",
            user_message=user_message
        )
    else:
        return TEMPLATE_CHAT.format(
            system_prompt=system_prompt,
            context=context or "No previous messages in this conversation.",
            user_message=user_message
        )


def format_messages_history(messages: List[Dict[str, str]]) -> str:
    """
    Format a list of messages into a conversation history string.
    
    Args:
        messages: List of message dicts with 'role' and 'content' keys
        
    Returns:
        Formatted conversation history string
    """
    if not messages:
        return ""
    
    formatted = []
    for msg in messages:
        role = msg.get("role", "user").upper()
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")
    
    return "\n".join(formatted)
