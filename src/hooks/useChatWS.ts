/**
 * useChatWS - React hook for WebSocket-based chat streaming
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_PROTOCOL = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
const WS_BASE_URL = API_BASE_URL.replace(/^https?:\/\//, '');

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

export interface UseChatWSOptions {
  conversationId: string;
  onError?: (error: Error) => void;
  onIntent?: (intent: string, entities: Record<string, unknown>) => void;
  autoConnect?: boolean;
}

export function useChatWS(options: UseChatWSOptions) {
  const { conversationId, onError, onIntent, autoConnect = true } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = `${WS_PROTOCOL}://${WS_BASE_URL}/api/chat/ws/${conversationId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log('Chat WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const chunk: ChatStreamChunk = JSON.parse(event.data);
          
          if (chunk.type === 'delta' && chunk.delta) {
            setCurrentResponse((prev) => prev + chunk.delta);
            setIsLoading(true);
          } else if (chunk.type === 'intent') {
            if (onIntent && chunk.intent) {
              onIntent(chunk.intent, chunk.entities || {});
            }
          } else if (chunk.type === 'done') {
            // Add complete response to messages
            if (currentResponse || chunk.full_response) {
              const fullText = chunk.full_response || currentResponse;
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: fullText },
              ]);
              setCurrentResponse('');
              setIsLoading(false);
            }
          } else if (chunk.type === 'error') {
            const error = new Error(chunk.error || 'Unknown error');
            setError(error);
            setIsLoading(false);
            if (onError) {
              onError(error);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      wsRef.current = ws;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to create WebSocket');
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [conversationId, onError, onIntent, currentResponse]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError(new Error('WebSocket not connected'));
      return;
    }

    // Add user message to messages
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setCurrentResponse('');
    setIsLoading(true);
    setError(null);

    try {
      wsRef.current.send(JSON.stringify({ text }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to send message');
      setError(error);
      setIsLoading(false);
      if (onError) {
        onError(error);
      }
    }
  }, [onError]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    messages,
    currentResponse,
    isConnected,
    isLoading,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}
