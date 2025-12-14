// src/hooks/useStatus.ts
import { useEffect, useState } from "react";
import { getStatus } from "@/api/bria";

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

  useEffect(() => {
    if (!requestId) {
      setStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const pollStatus = async () => {
      try {
        const data = await getStatus(requestId);
        setStatus(data);
        
        // Stop polling if job is completed or failed
        if (data?.status === "COMPLETED" || data?.status === "ERROR") {
          setIsLoading(false);
          return false;
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch status"));
        setIsLoading(false);
        return false;
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      const shouldContinue = await pollStatus();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsLoading(false);
    };
  }, [requestId]);

  return { status, isLoading, error };
}