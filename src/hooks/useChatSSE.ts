/**
 * useChatSSE - React hook for Server-Sent Events (SSE) based chat streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatStreamChunk {
  type: 'delta' | 'intent' | 'done' | 'error';
  delta?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  full_response?: string;
  error?: string;
}

export interface UseChatSSEOptions {
  conversationId: string;
  onError?: (error: Error) => void;
  onIntent?: (intent: string, entities: Record<string, unknown>) => void;
}

export function useChatSSE(options: UseChatSSEOptions) {
  const { conversationId, onError, onIntent } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setCurrentResponse('');
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: [
            ...messages,
            { role: 'user', content: text },
          ],
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: ChatStreamChunk = JSON.parse(line.slice(6));
              
              if (chunk.type === 'delta' && chunk.delta) {
                setCurrentResponse((prev) => prev + chunk.delta);
              } else if (chunk.type === 'intent') {
                if (onIntent && chunk.intent) {
                  onIntent(chunk.intent, chunk.entities || {});
                }
              } else if (chunk.type === 'done') {
                const fullText = chunk.full_response || currentResponse;
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: fullText },
                ]);
                setCurrentResponse('');
                setIsLoading(false);
              } else if (chunk.type === 'error') {
                const error = new Error(chunk.error || 'Unknown error');
                setError(error);
                setIsLoading(false);
                if (onError) {
                  onError(error);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const chunk: ChatStreamChunk = JSON.parse(buffer.slice(6));
          if (chunk.type === 'done') {
            const fullText = chunk.full_response || currentResponse;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: fullText },
            ]);
            setCurrentResponse('');
            setIsLoading(false);
          }
        } catch (e) {
          console.error('Error parsing final SSE data:', e);
        }
      }

    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      
      const error = e instanceof Error ? e : new Error('Failed to send message');
      setError(error);
      setIsLoading(false);
      if (onError) {
        onError(error);
      }
    }
  }, [conversationId, messages, currentResponse, onError, onIntent]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    currentResponse,
    isLoading,
    error,
    sendMessage,
  };
}
