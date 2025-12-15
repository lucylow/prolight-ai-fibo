import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface StatusUpdate {
  requestId: string;
  status: string;
  progress?: number;
  message?: string;
  data?: unknown;
  error?: string;
}

export function useStatusSSE(requestId: string | null) {
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const { api } = useAuth();

  useEffect(() => {
    if (!requestId) {
      setStatus(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const connectSSE = async () => {
      try {
        // Get SSE token if backend requires it
        let sseUrl: string;
        try {
          const tokenResp = await api.get(`/status/sse-token`, {
            params: { request_id: requestId },
          });
          const token = tokenResp.data?.token || tokenResp.data?.access_token;
          sseUrl = `${api.defaults.baseURL}/status/subscribe?request_id=${requestId}&token=${encodeURIComponent(token)}`;
        } catch (tokenError) {
          // If token endpoint doesn't exist, try direct connection
          console.warn("SSE token endpoint not available, trying direct connection");
          sseUrl = `${api.defaults.baseURL}/status/subscribe?request_id=${requestId}`;
        }

        if (cancelled) return;

        sourceRef.current = new EventSource(sseUrl);

        sourceRef.current.onmessage = (e) => {
          if (cancelled) return;
          try {
            const payload: StatusUpdate = JSON.parse(e.data);
            setStatus(payload);
            setError(null);
          } catch (parseError) {
            console.error("Failed to parse SSE message:", parseError);
          }
        };

        sourceRef.current.onerror = (err) => {
          if (cancelled) return;
          console.error("SSE connection error:", err);
          setError(new Error("SSE connection failed"));
          sourceRef.current?.close();
        };

        sourceRef.current.addEventListener("error", () => {
          if (cancelled) return;
          sourceRef.current?.close();
        });
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to establish SSE connection:", e);
        setError(e instanceof Error ? e : new Error("SSE connection failed"));
      }
    };

    connectSSE();

    return () => {
      cancelled = true;
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };
  }, [requestId, api]);

  return { status, error };
}


