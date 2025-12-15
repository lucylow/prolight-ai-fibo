/**
 * Shared Lovable AI Gateway Client
 * Provides consistent API calls, error handling, retry logic, and type safety
 * for all Supabase Edge Functions that use the Lovable AI Gateway
 */

const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * AI Gateway request configuration
 */
export interface AIGatewayConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTTL?: number; // Cache TTL in milliseconds
  enableDeduplication?: boolean; // Deduplicate identical requests
  maxConcurrentRequests?: number; // Rate limiting
  enableMetrics?: boolean; // Performance metrics
}

/**
 * Chat completion message
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Chat completion request payload
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  modalities?: string[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

/**
 * AI Gateway response structure
 */
export interface AIGatewayResponse {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        image_url?: {
          url?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
}

/**
 * AI Gateway error response
 */
export interface AIGatewayError {
  error: string;
  errorCode: string;
  statusCode: number;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Result from AI Gateway request
 */
export interface AIGatewayResult {
  textContent: string;
  imageUrl?: string;
  cached?: boolean; // Whether result was served from cache
  requestId?: string; // Unique request identifier
}

/**
 * Cache entry for request deduplication and response caching
 */
interface CacheEntry {
  result: AIGatewayResult;
  timestamp: number;
  expiresAt: number;
}

/**
 * Request metrics for monitoring
 */
export interface RequestMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  deduplicatedRequests: number;
  averageLatency: number;
  errors: number;
  rateLimitedRequests: number;
}

/**
 * Custom error class for AI Gateway errors
 */
export class AIGatewayErrorClass extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "AIGatewayError";
    Object.setPrototypeOf(this, AIGatewayErrorClass.prototype);
  }
}

/**
 * Create AI Gateway client with enhanced features
 */
export function createAIGatewayClient(apiKey: string, config: AIGatewayConfig = {}) {
  const {
    timeout = 60000, // 60s default
    retries = 2,
    retryDelay = 1000,
    enableCache = true, // Enable caching by default
    cacheTTL = 300000, // 5 minutes default cache TTL
    enableDeduplication = true, // Enable request deduplication
    maxConcurrentRequests = 10, // Max concurrent requests
    enableMetrics = true, // Enable metrics collection
  } = config;

  // Request cache for deduplication and response caching
  const requestCache = new Map<string, CacheEntry>();
  const pendingRequests = new Map<string, Promise<AIGatewayResult>>();
  let concurrentRequestCount = 0;
  const requestQueue: Array<{
    payload: ChatCompletionRequest;
    resolve: (value: AIGatewayResult) => void;
    reject: (error: unknown) => void;
  }> = [];

  // Metrics tracking
  const metrics: RequestMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    deduplicatedRequests: 0,
    averageLatency: 0,
    errors: 0,
    rateLimitedRequests: 0,
  };

  // Clean up expired cache entries periodically
  if (enableCache) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of requestCache.entries()) {
        if (now > entry.expiresAt) {
          requestCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Generate cache key from request payload
   */
  function generateCacheKey(payload: ChatCompletionRequest): string {
    // Create a deterministic key from the request
    const key = JSON.stringify({
      model: payload.model,
      messages: payload.messages,
      modalities: payload.modalities,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `ai_gateway_${hash}`;
  }

  /**
   * Process queued requests
   */
  async function processQueue(): Promise<void> {
    while (requestQueue.length > 0 && concurrentRequestCount < maxConcurrentRequests) {
      const item = requestQueue.shift();
      if (!item) continue;

      concurrentRequestCount++;
      makeRequest(item.payload)
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          concurrentRequestCount--;
          processQueue(); // Process next item in queue
        });
    }
  }

  if (!apiKey) {
    throw new AIGatewayErrorClass(
      "LOVABLE_API_KEY is not configured. Please add it to your project secrets.",
      "CONFIG_ERROR",
      500,
      {
        helpUrl: "https://docs.lovable.dev/guides/secrets",
      },
      false
    );
  }

  /**
   * Make request to AI Gateway with retry logic, caching, and deduplication
   */
  async function makeRequest(
    payload: ChatCompletionRequest,
    attempt: number = 0,
    skipCache: boolean = false
  ): Promise<AIGatewayResult> {
    const startTime = Date.now();
    metrics.totalRequests++;

    // Check cache first (unless explicitly skipped)
    if (enableCache && !skipCache && attempt === 0) {
      const cacheKey = generateCacheKey(payload);
      const cached = requestCache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        metrics.cacheHits++;
        const latency = Date.now() - startTime;
        metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;
        
        console.log(`[AI Gateway] Cache hit for request: ${cacheKey.substring(0, 20)}...`);
        return {
          ...cached.result,
          cached: true,
        };
      }
      metrics.cacheMisses++;

      // Check if there's a pending identical request (deduplication)
      if (enableDeduplication && pendingRequests.has(cacheKey)) {
        metrics.deduplicatedRequests++;
        console.log(`[AI Gateway] Deduplicating request: ${cacheKey.substring(0, 20)}...`);
        try {
          const result = await pendingRequests.get(cacheKey)!;
          return { ...result, cached: false };
        } catch (error) {
          // If pending request failed, continue with new request
        }
      }
    }

    // Queue request if we're at max concurrent requests
    if (concurrentRequestCount >= maxConcurrentRequests) {
      return new Promise<AIGatewayResult>((resolve, reject) => {
        requestQueue.push({ payload, resolve, reject });
        processQueue();
      });
    }

    concurrentRequestCount++;

    const cacheKey = enableCache ? generateCacheKey(payload) : '';
    const requestPromise = (async (): Promise<AIGatewayResult> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const requestId = crypto.randomUUID();
        const response = await fetch(LOVABLE_AI_GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            metrics.rateLimitedRequests++;
          }
          // handleErrorResponse will throw or return a retry result
          return await handleErrorResponse(response, attempt, payload);
        }

        const data: AIGatewayResponse = await response.json();
        const result = await validateAndExtractResponse(data, attempt, payload);
        
        // Add request ID to result
        result.requestId = requestId;

        // Cache successful response
        if (enableCache && !skipCache && attempt === 0 && cacheKey) {
          const now = Date.now();
          requestCache.set(cacheKey, {
            result,
            timestamp: now,
            expiresAt: now + cacheTTL,
          });
        }

        const latency = Date.now() - startTime;
        metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;

        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        metrics.errors++;
        const latency = Date.now() - startTime;
        metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;
        return handleRequestError(error, attempt, payload);
      } finally {
        concurrentRequestCount--;
        if (enableDeduplication && cacheKey) {
          pendingRequests.delete(cacheKey);
        }
        processQueue(); // Process next queued request
      }
    })();

    // Track pending request for deduplication
    if (enableDeduplication && cacheKey) {
      pendingRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
  }

  /**
   * Handle error responses from AI Gateway
   */
  async function handleErrorResponse(
    response: Response,
    attempt: number,
    payload: ChatCompletionRequest
  ): Promise<AIGatewayResult> {
    let errorText = "";
    let errorData: Record<string, unknown> | null = null;

    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch {
      // If parsing fails, use raw text
    }

    console.error(`AI Gateway error (attempt ${attempt + 1}):`, response.status, errorText);

    // Handle specific error codes
    if (response.status === 401) {
      throw new AIGatewayErrorClass(
        "AI service authentication failed. Please check API configuration.",
        "AI_AUTH_ERROR",
        502,
        errorData,
        false
      );
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60";
      const retryAfterNum = parseInt(retryAfter);
      
      if (attempt < retries) {
        console.log(`Rate limited, retrying after ${retryAfterNum}s (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterNum * 1000));
        return makeRequest(payload, attempt + 1);
      }

      throw new AIGatewayErrorClass(
        `AI service rate limit exceeded. Please try again in ${retryAfterNum} seconds.`,
        "AI_RATE_LIMIT",
        429,
        { retryAfter: retryAfterNum },
        true,
        retryAfterNum
      );
    }

    if (response.status === 402) {
      throw new AIGatewayErrorClass(
        "AI service payment required. Please add credits to your workspace.",
        "AI_PAYMENT_REQUIRED",
        402,
        errorData,
        false
      );
    }

    // Retry on server errors
    if (response.status >= 500 && attempt < retries) {
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(`Server error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return makeRequest(payload, attempt + 1, true); // Skip cache on retries
    }

    if (response.status >= 500) {
      throw new AIGatewayErrorClass(
        "AI service temporarily unavailable. Please try again later.",
        "AI_SERVER_ERROR",
        502,
        {
          errorMessage: errorData?.error?.message || errorText.substring(0, 200),
        },
        true
      );
    }

    // Client errors (4xx)
    throw new AIGatewayErrorClass(
      `AI service error: ${errorData?.error?.message || errorText.substring(0, 200) || "Unknown error"}`,
      "AI_CLIENT_ERROR",
      502,
      errorData,
      false
    );
  }

  /**
   * Validate and extract response data
   */
  function validateAndExtractResponse(
    data: AIGatewayResponse,
    attempt: number,
    payload: ChatCompletionRequest
  ): AIGatewayResult {
    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Invalid response structure, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        return new Promise((resolve) => {
          setTimeout(async () => {
            resolve(await makeRequest(payload, attempt + 1));
          }, delay);
        });
      }
      throw new AIGatewayErrorClass(
        "AI service returned invalid response structure. Please try again.",
        "AI_INVALID_RESPONSE",
        502,
        { response: data },
        true
      );
    }

    const message = data.choices[0]?.message;
    if (!message) {
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Missing message in response, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequest(payload, attempt + 1, true); // Skip cache on retries
      }
      throw new AIGatewayErrorClass(
        "AI service returned incomplete response. Please try again.",
        "AI_INCOMPLETE_RESPONSE",
        502,
        { response: data },
        true
      );
    }

    const textContent = message.content || "";
    const imageUrl = message.images?.[0]?.image_url?.url;

    return {
      textContent,
      imageUrl,
    };
  }

  /**
   * Handle request errors (network, timeout, etc.)
   */
  async function handleRequestError(
    error: unknown,
    attempt: number,
    payload: ChatCompletionRequest
  ): Promise<AIGatewayResult> {
    if (error instanceof AIGatewayErrorClass) {
      throw error;
    }

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Request timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequest(payload, attempt + 1, true); // Skip cache on retries
      }
      throw new AIGatewayErrorClass(
        "AI service request timed out. Please try again.",
        "AI_TIMEOUT",
        504,
        undefined,
        true
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequest(payload, attempt + 1, true); // Skip cache on retries
      }
      throw new AIGatewayErrorClass(
        "Network error connecting to AI service. Please check your connection.",
        "AI_NETWORK_ERROR",
        503,
        { originalError: error.message },
        true
      );
    }

    // Unknown error
    throw new AIGatewayErrorClass(
      error instanceof Error ? error.message : "Unknown error occurred",
      "AI_UNKNOWN_ERROR",
      500,
      { originalError: error },
      false
    );
  }

  /**
   * Call chat completions endpoint
   */
  async function chatCompletions(
    request: ChatCompletionRequest
  ): Promise<AIGatewayResult> {
    return makeRequest(request);
  }

  /**
   * Generate image with text (multimodal)
   */
  async function generateImage(
    prompt: string,
    model: string = "google/gemini-2.5-flash-image-preview"
  ): Promise<AIGatewayResult> {
    return chatCompletions({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
    });
  }

  /**
   * Translate text (chat completion)
   */
  async function translateText(
    systemPrompt: string,
    userPrompt: string,
    model: string = "google/gemini-2.5-flash"
  ): Promise<AIGatewayResult> {
    return chatCompletions({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });
  }

  /**
   * Get request metrics
   */
  function getMetrics(): RequestMetrics {
    return { ...metrics };
  }

  /**
   * Clear request cache
   */
  function clearCache(): void {
    requestCache.clear();
    console.log('[AI Gateway] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  function getCacheStats(): { size: number; entries: number } {
    return {
      size: requestCache.size,
      entries: Array.from(requestCache.values()).length,
    };
  }

  return {
    chatCompletions,
    generateImage,
    translateText,
    makeRequest,
    getMetrics: enableMetrics ? getMetrics : undefined,
    clearCache: enableCache ? clearCache : undefined,
    getCacheStats: enableCache ? getCacheStats : undefined,
  };
}

/**
 * Create AI Gateway client from environment with enhanced secret management
 */
export function createAIGatewayClientFromEnv(
  config?: AIGatewayConfig
): ReturnType<typeof createAIGatewayClient> {
  try {
    // Try to use enhanced secret management if available (static import)
    let apiKey: string | null = null;
    
    // Try enhanced secret management (import must be at top of file if used)
    // For now, we'll use direct env access with validation
    apiKey = Deno.env.get("LOVABLE_API_KEY");
    
    // Try alternative names based on environment
    if (!apiKey || apiKey.trim().length === 0) {
      const env = Deno.env.get('NODE_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
      if (env === 'production' || env === 'prod') {
        apiKey = Deno.env.get("LOVABLE_API_KEY_PROD") || Deno.env.get("PRODUCTION_API_KEY");
      } else if (env === 'staging' || env === 'stage') {
        apiKey = Deno.env.get("LOVABLE_API_KEY_STAGING") || Deno.env.get("STAGING_API_KEY");
      } else {
        apiKey = Deno.env.get("LOVABLE_API_KEY_DEV") || Deno.env.get("DEV_API_KEY");
      }
    }
    
    if (!apiKey || apiKey.trim().length === 0) {
      throw new AIGatewayErrorClass(
        "LOVABLE_API_KEY is not configured. Please add it to your Lovable project secrets.",
        "CONFIG_ERROR",
        500,
        {
          message:
            "The LOVABLE_API_KEY environment variable is required for AI image generation. Please configure it in your Lovable project settings under Secrets.",
          helpUrl: "https://docs.lovable.dev/guides/secrets",
        },
        false
      );
    }
    
    // Basic validation
    if (apiKey.includes('your_') || apiKey.includes('placeholder') || apiKey.length < 10) {
      throw new AIGatewayErrorClass(
        "LOVABLE_API_KEY appears to be a placeholder. Please set a valid API key in your Lovable project secrets.",
        "CONFIG_ERROR",
        500,
        {
          helpUrl: "https://docs.lovable.dev/guides/secrets",
        },
        false
      );
    }
    
    return createAIGatewayClient(apiKey, config);
  } catch (error) {
    if (error instanceof AIGatewayErrorClass) {
      throw error;
    }
    throw new AIGatewayErrorClass(
      `Failed to initialize AI Gateway client: ${error instanceof Error ? error.message : String(error)}`,
      "CONFIG_ERROR",
      500,
      {
        originalError: error instanceof Error ? error.message : String(error),
        helpUrl: "https://docs.lovable.dev/guides/secrets",
      },
      false
    );
  }
}

/**
 * AI Gateway client type
 */
export type AIGatewayClient = ReturnType<typeof createAIGatewayClient>;

