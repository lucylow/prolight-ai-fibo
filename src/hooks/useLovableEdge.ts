import useSWR from "swr";

type Env = "PRODUCTION" | "STAGING" | "COMFYUI" | "MCP" | "DEV";

const LOVABLE_BASE_URL =
  import.meta.env.VITE_LOVABLE_BASE_URL ??
  "https://your-app.lovable.dev";

const PROLIGHT_ENV: Env =
  (import.meta.env.VITE_PROLIGHT_ENV as Env) ?? "DEV";

async function fetcher<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Edge request failed: ${res.status} ${res.statusText} – ${text}`,
    );
  }
  return (await res.json()) as T;
}

// --- Public typed APIs for each function ---

export interface NaturalLanguageLightingRequest {
  instruction: string;
  current_lighting?: unknown;
}

export interface NaturalLanguageLightingResponse {
  lighting: unknown;
  confidence: number;
  changes_made: string[];
  meta?: { model?: string; latency_ms?: number };
}

export interface AnalyzeLightingRequest {
  image_b64?: string;
  image_url?: string;
}

export interface AnalyzeLightingResponse {
  lighting: unknown;
  confidence: Record<string, number>;
  estimated_params: { fov: number; aperture: string };
}

export interface GenerateLightingRequest {
  fibo_json: unknown;
  provider: "bria" | "fal" | "comfyui";
  batch_size?: number;
}

export interface GenerateLightingResponse {
  images: string[];
  fibo_used: unknown;
  deterministic_id: string;
  analytics: {
    render_time_ms: number;
    cost_estimate: number;
    provider: string;
  };
}

export interface GetPresetsRequest {
  type: "wedding" | "product" | "portrait" | "ecommerce";
  user_id?: string;
  customize?: { more_dramatic?: boolean };
}

export interface GetPresetsResponse {
  presets: any[];
  recommended: any;
  usage_stats: { popular_by_type: Record<string, number> };
}

export function useNaturalLanguageLighting(
  payload?: NaturalLanguageLightingRequest,
) {
  const key =
    payload && payload.instruction.trim().length
      ? ["natural-language-lighting", payload]
      : null;

  const { data, error, isLoading, mutate } = useSWR<
    NaturalLanguageLightingResponse
  >(key, (_, body) =>
    fetcher(
      `${LOVABLE_BASE_URL}/natural-language-lighting`,
      body,
    ),
  );

  return {
    data,
    error,
    isLoading,
    refresh: () => mutate(),
    env: PROLIGHT_ENV,
  };
}

export function useAnalyzeLighting(payload?: AnalyzeLightingRequest) {
  const key =
    payload && (payload.image_b64 || payload.image_url)
      ? ["analyze-lighting", payload]
      : null;

  const { data, error, isLoading, mutate } = useSWR<
    AnalyzeLightingResponse
  >(key, (_, body) =>
    fetcher(`${LOVABLE_BASE_URL}/analyze-lighting`, body),
  );

  return {
    data,
    error,
    isLoading,
    refresh: () => mutate(),
    env: PROLIGHT_ENV,
  };
}

export function useGenerateLighting(payload?: GenerateLightingRequest) {
  const key =
    payload && payload.fibo_json
      ? ["generate-lighting", payload]
      : null;

  const { data, error, isLoading, mutate } = useSWR<
    GenerateLightingResponse
  >(key, (_, body) =>
    fetcher(`${LOVABLE_BASE_URL}/generate-lighting`, body),
  );

  return {
    data,
    error,
    isLoading,
    refresh: () => mutate(),
    env: PROLIGHT_ENV,
  };
}

export function useGetPresets(payload?: GetPresetsRequest) {
  const key =
    payload && payload.type ? ["get-presets", payload] : null;

  const { data, error, isLoading, mutate } = useSWR<GetPresetsResponse>(
    key,
    (_, body) => fetcher(`${LOVABLE_BASE_URL}/get-presets`, body),
  );

  return {
    data,
    error,
    isLoading,
    refresh: () => mutate(),
    env: PROLIGHT_ENV,
  };
}


