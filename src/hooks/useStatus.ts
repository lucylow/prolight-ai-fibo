// src/hooks/useStatus.ts
import { useEffect, useState, useRef } from "react";
import { getStatus } from "@/api/bria";
import { errorService } from "@/services/errorService";

interface StatusResponse {
  status?: string;
  state?: string;
  error?: string;
  data?: unknown;
}

export function useStatus(requestId?: string) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!requestId) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const pollStatus = async () => {
      // Don't poll if component is unmounted
      if (!isMountedRef.current) {
        return false;
      }

      try {
        const data = await getStatus(requestId);
        
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) {
          return false;
        }

        setStatus(data);
        
        // Stop polling if job is completed or failed
        if (data?.status === "COMPLETED" || data?.status === "ERROR") {
          setIsLoading(false);
          return false;
        }
        return true;
      } catch (err) {
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) {
          return false;
        }

        const error = err instanceof Error ? err : new Error("Failed to fetch status");
        setError(error);
        setIsLoading(false);
        
        // Log error for monitoring
        errorService.logError(error, {
          component: 'useStatus',
          action: 'poll_status',
          metadata: { requestId },
        }).catch((logErr) => {
          console.error('Failed to log status polling error:', logErr);
        });

        return false;
      }
    };

    // Initial poll
    pollStatus().catch((err) => {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error("Failed to fetch status");
        setError(error);
        setIsLoading(false);
        
        errorService.logError(error, {
          component: 'useStatus',
          action: 'initial_poll',
          metadata: { requestId },
        }).catch((logErr) => {
          console.error('Failed to log initial poll error:', logErr);
        });
      }
    });

    // Poll every 2 seconds
    intervalRef.current = setInterval(async () => {
      const shouldContinue = await pollStatus();
      if (!shouldContinue && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsLoading(false);
    };
  }, [requestId]);

  return { status, isLoading, error };
}

