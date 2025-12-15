export type EdgeFunctionName =
  | "natural-language-lighting"
  | "analyze-lighting"
  | "generate-lighting"
  | "get-presets";

export type AnalyticsEvent =
  | "request.start"
  | "request.success"
  | "request.error";

interface TrackOptions {
  functionName: EdgeFunctionName;
  event: AnalyticsEvent;
  durationMs?: number;
  errorMessage?: string;
  extra?: Record<string, unknown>;
}

// Placeholder analytics tracker for Lovable. In production this can forward
// to Lovable analytics, a logging service, or data warehouse.
export async function trackEdgeAnalytics(opts: TrackOptions): Promise<void> {
  try {
    const payload = {
      ts: new Date().toISOString(),
      ...opts,
    };

    // Lovable typically exposes a logging/analytics sink; until then, use console.
    // eslint-disable-next-line no-console
    console.log("[edge-analytics]", JSON.stringify(payload));
  } catch {
    // Never throw from analytics – fail silently.
  }
}


