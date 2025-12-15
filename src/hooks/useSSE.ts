/**
 * SSE (Server-Sent Events) hook with reconnection and backoff
 */
import { useEffect, useRef, useCallback } from "react";
import { useAgentStore } from "@/stores/agentStore";
import type { SSEEvent } from "@/types/workflow";

interface UseSSEOptions {
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MAX_RECONNECT_DELAY = 60000; // 1 minute
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

export function useSSE(
  runId: string | null,
  token: string | null,
  options: UseSSEOptions = {}
) {
  const { enabled = true, onEvent, onError, onConnect, onDisconnect } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isManuallyClosedRef = useRef(false);
  
  const { receiveSSEEvent, setSSEConnection, updateRunStatus } = useAgentStore();

  const connect = useCallback(() => {
    if (!runId || !token || !enabled) {
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${API_BASE_URL}/api/agent/runs/${runId}/events?token=${encodeURIComponent(token)}`;
    
    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      // Update connection status
      setSSEConnection(runId, {
        run_id: runId,
        lastEventAt: Date.now(),
        status: "connected",
      });

      eventSource.onopen = () => {
        reconnectAttemptRef.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          
          // Update connection timestamp
          if (runId) {
            setSSEConnection(runId, {
              run_id: runId,
              lastEventAt: Date.now(),
              status: "connected",
            });
          }
          
          // Process event in store
          receiveSSEEvent(event);
          
          // Call custom handler if provided
          onEvent?.(event);
          
          // Handle final event
          if (event.type === "final") {
            eventSource.close();
            eventSourceRef.current = null;
            isManuallyClosedRef.current = true;
          }
        } catch (error) {
          console.error("Failed to parse SSE event:", error);
          onError?.(error as Error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection closed
          if (runId) {
            setSSEConnection(runId, {
              run_id: runId,
              lastEventAt: Date.now(),
              status: "disconnected",
            });
          }
          
          onDisconnect?.();
          
          // Attempt reconnection if not manually closed
          if (!isManuallyClosedRef.current && enabled) {
            const delay = Math.min(
              INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
              MAX_RECONNECT_DELAY
            );
            
            reconnectAttemptRef.current += 1;
            
            if (runId) {
              setSSEConnection(runId, {
                run_id: runId,
                lastEventAt: Date.now(),
                status: "reconnecting",
              });
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        } else {
          // Connection error
          onError?.(new Error("SSE connection error"));
        }
      };
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      onError?.(error as Error);
      
      if (runId) {
        setSSEConnection(runId, {
          run_id: runId,
          lastEventAt: Date.now(),
          status: "error",
        });
      }
    }
  }, [runId, token, enabled, onEvent, onError, onConnect, onDisconnect, receiveSSEEvent, setSSEConnection]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (runId) {
      setSSEConnection(runId, null);
    }
  }, [runId, setSSEConnection]);

  useEffect(() => {
    if (enabled && runId && token) {
      isManuallyClosedRef.current = false;
      reconnectAttemptRef.current = 0;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, runId, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}
