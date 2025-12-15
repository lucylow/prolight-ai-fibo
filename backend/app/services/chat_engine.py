"""
Chat Engine - Orchestrates intent detection, RAG, and LLM streaming.
"""

import logging
from typing import AsyncGenerator, List, Dict, Optional, Any
from app.services.intent_classifier import analyze_message
from app.services.vector_store import query_memory, add_to_memory, get_conversation_history
from app.services.prompt_templates import format_chat_prompt, format_messages_history
from app.services.llm_stream import stream_llm_responses

logger = logging.getLogger(__name__)


class ChatEngine:
    """Main chat engine that handles conversation flow."""
    
    def __init__(self):
        """Initialize chat engine."""
        self.max_context_messages = 10
        self.rag_top_k = 5
    
    async def get_context(
        self,
        conversation_id: str,
        user_text: str,
        include_rag: bool = True
    ) -> Tuple[str, str]:
        """
        Get conversation context and retrieved documents.
        
        Args:
            conversation_id: Conversation identifier
            user_text: Current user message
            include_rag: Whether to include RAG retrieval
            
        Returns:
            Tuple of (conversation_history, retrieved_docs)
        """
        # Get recent conversation history
        history_messages = await get_conversation_history(
            conversation_id,
            limit=self.max_context_messages
        )
        
        # Format history
        formatted_history = format_messages_history(history_messages)
        
        # RAG: Retrieve similar past messages
        retrieved_docs = ""
        if include_rag:
            similar_messages = await query_memory(conversation_id, user_text, k=self.rag_top_k)
            if similar_messages:
                retrieved_texts = [f"- {msg['text']}" for msg in similar_messages if msg.get('score', 0) > 0.5]
                if retrieved_texts:
                    retrieved_docs = "\n".join(retrieved_texts)
        
        return formatted_history, retrieved_docs
    
    async def stream_response(
        self,
        conversation_id: str,
        user_text: str,
        intent_override: Optional[Dict] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat response with context and RAG.
        
        Args:
            conversation_id: Conversation identifier
            user_text: User message text
            intent_override: Optional pre-computed intent (for efficiency)
            
        Yields:
            Dictionary with 'delta' (text chunk) and optionally 'intent', 'entities'
        """
        try:
            # Analyze message intent
            if intent_override:
                intent_info = intent_override
            else:
                intent_info = analyze_message(user_text)
            
            # Get context
            context, retrieved_docs = await self.get_context(
                conversation_id,
                user_text,
                include_rag=True
            )
            
            # Build prompt
            use_rag = bool(retrieved_docs)
            prompt = format_chat_prompt(
                user_message=user_text,
                context=context,
                use_rag=use_rag,
                retrieved_docs=retrieved_docs
            )
            
            # Send intent info first (if not chat)
            if intent_info.get("intent") != "chat":
                yield {
                    "type": "intent",
                    "intent": intent_info.get("intent"),
                    "entities": intent_info.get("entities", {}),
                }
            
            # Stream LLM response
            full_response = ""
            async for chunk in stream_llm_responses(prompt):
                full_response += chunk
                yield {
                    "type": "delta",
                    "delta": chunk,
                }
            
            # Store in memory after response is complete
            await add_to_memory(
                conversation_id,
                user_text,
                metadata={"role": "user"}
            )
            await add_to_memory(
                conversation_id,
                full_response,
                metadata={"role": "assistant"}
            )
            
            # Send completion signal
            yield {
                "type": "done",
                "full_response": full_response,
            }
            
        except Exception as e:
            logger.error(f"Error in stream_response: {e}")
            yield {
                "type": "error",
                "error": str(e),
            }
    
    async def get_response(
        self,
        conversation_id: str,
        user_text: str
    ) -> Dict[str, any]:
        """
        Get complete response (non-streaming).
        
        Args:
            conversation_id: Conversation identifier
            user_text: User message text
            
        Returns:
            Dictionary with 'reply', 'intent', 'entities'
        """
        intent_info = analyze_message(user_text)
        full_response = ""
        
        async for chunk in self.stream_response(conversation_id, user_text, intent_info):
            if chunk.get("type") == "delta":
                full_response += chunk.get("delta", "")
        
        return {
            "reply": full_response,
            "intent": intent_info.get("intent"),
            "entities": intent_info.get("entities", {}),
        }

