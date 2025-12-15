/**
 * Custom hook for managing SSE stream connections for agent runs
 * Handles reconnection logic and event parsing
 */

import { useCallback, useRef, useEffect } from "react";
import type { RunLog, AgentState, SSEEvent } from "@/types/agentic";
import { agentService } from "@/services/agentService";

interface StreamManager {
  eventSource: EventSource | null;
  reconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  isManualClose: boolean;
}

interface UseRunStreamOptions {
  runId: string | null;
  onEvent?: (event: SSEEvent) => void;
  onLog?: (log: RunLog) => void;
  onStatusChange?: (status: AgentState) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface UseRunStreamReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export function useRunStream({
  runId,
  onEvent,
  onLog,
  onStatusChange,
  autoReconnect = true,
  maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
}: UseRunStreamOptions): UseRunStreamReturn {
  const streamManagerRef = useRef<StreamManager>({
    eventSource: null,
    reconnectAttempts: 0,
    reconnectDelay: DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts,
    isManualClose: false,
  });

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      // Call custom event handler
      if (onEvent) {
        onEvent(event);
      }

      // Handle specific event types
      switch (event.type) {
        case "LOG":
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "log",
              message: event.message || "",
              data: event.data,
            });
          }
          break;

        case "STATE_CHANGE":
          if (event.state && onStatusChange) {
            onStatusChange(event.state);
          }
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "status",
              message: `State changed to: ${event.state}`,
            });
          }
          break;

        case "PROGRESS":
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "log",
              message: event.message || `Progress: ${event.pct || 0}%`,
            });
          }
          break;

        case "PROPOSAL":
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "proposal",
              message: JSON.stringify(event.proposal || {}),
            });
          }
          break;

        case "ERROR":
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "error",
              message: event.message || event.reason || "An error occurred",
            });
          }
          if (event.state && onStatusChange) {
            onStatusChange("FAILED");
          }
          break;

        default:
          console.warn("Unknown event type:", event.type);
      }
    },
    [onEvent, onLog, onStatusChange]
  );

  const disconnect = useCallback(() => {
    const manager = streamManagerRef.current;
    if (manager.eventSource) {
      manager.isManualClose = true;
      manager.eventSource.close();
      manager.eventSource = null;
      manager.reconnectAttempts = 0;
    }
  }, []);

  const connect = useCallback(() => {
    if (!runId) {
      return;
    }

    const manager = streamManagerRef.current;

    // Close existing connection
    if (manager.eventSource) {
      manager.eventSource.close();
    }

    manager.isManualClose = false;
    manager.reconnectAttempts = 0;

    const attemptReconnect = () => {
      if (
        manager.isManualClose ||
        !autoReconnect ||
        manager.reconnectAttempts >= manager.maxReconnectAttempts
      ) {
        if (manager.reconnectAttempts >= manager.maxReconnectAttempts && onLog) {
          onLog({
            t: Date.now(),
            type: "error",
            message: "Max reconnection attempts reached",
          });
        }
        if (onStatusChange && manager.reconnectAttempts >= manager.maxReconnectAttempts) {
          onStatusChange("FAILED");
        }
        return;
      }

      manager.reconnectAttempts++;
      const delay = manager.reconnectDelay * Math.pow(2, manager.reconnectAttempts - 1);

      if (onLog) {
        onLog({
          t: Date.now(),
          type: "log",
          message: `Reconnecting... (attempt ${manager.reconnectAttempts}/${manager.maxReconnectAttempts})`,
        });
      }

      setTimeout(() => {
        if (!manager.isManualClose && runId) {
          connect();
        }
      }, delay);
    };

    try {
      const sseUrl = agentService.getStreamUrl(runId);
      const es = new EventSource(sseUrl, { withCredentials: true });
      manager.eventSource = es;

      es.onopen = () => {
        manager.reconnectAttempts = 0;
        if (onLog) {
          onLog({
            t: Date.now(),
            type: "status",
            message: "Stream connected",
          });
        }
      };

      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as SSEEvent;
          handleEvent(payload);
        } catch (err) {
          console.warn("Invalid SSE message", ev.data, err);
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "error",
              message: "Failed to parse stream event",
            });
          }
        }
      };

      es.onerror = (err) => {
        console.error("SSE error", err);

        if (es.readyState === EventSource.CLOSED) {
          // Connection closed
          if (!manager.isManualClose) {
            attemptReconnect();
          }
        } else if (es.readyState === EventSource.CONNECTING) {
          // Connection lost
          if (onLog) {
            onLog({
              t: Date.now(),
              type: "log",
              message: "Connection lost, attempting to reconnect...",
            });
          }
        }
      };
    } catch (err) {
      console.error("Failed to open stream", err);
      attemptReconnect();
    }
  }, [runId, autoReconnect, handleEvent, onLog, onStatusChange]);

  const reconnect = useCallback(() => {
    disconnect();
    if (runId) {
      setTimeout(() => connect(), 500);
    }
  }, [runId, connect, disconnect]);

  // Auto-connect when runId changes
  useEffect(() => {
    if (runId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [runId, connect, disconnect]);

  const isConnected =
    streamManagerRef.current.eventSource?.readyState === EventSource.OPEN;

  return {
    isConnected,
    connect,
    disconnect,
    reconnect,
  };
}

