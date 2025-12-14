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
      };
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
 * Create AI Gateway client
 */
export function createAIGatewayClient(apiKey: string, config: AIGatewayConfig = {}) {
  const {
    timeout = 60000, // 60s default
    retries = 2,
    retryDelay = 1000,
  } = config;

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
   * Make request to AI Gateway with retry logic
   */
  async function makeRequest(
    payload: ChatCompletionRequest,
    attempt: number = 0
  ): Promise<AIGatewayResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
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
        return handleErrorResponse(response, attempt, payload);
      }

      const data: AIGatewayResponse = await response.json();
      return validateAndExtractResponse(data, attempt, payload);
    } catch (error) {
      clearTimeout(timeoutId);
      return handleRequestError(error, attempt, payload);
    }
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
      return makeRequest(payload, attempt + 1);
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
        return new Promise((resolve) => {
          setTimeout(async () => {
            resolve(await makeRequest(payload, attempt + 1));
          }, delay);
        });
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
        return makeRequest(payload, attempt + 1);
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
        return makeRequest(payload, attempt + 1);
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

  return {
    chatCompletions,
    generateImage,
    translateText,
    makeRequest,
  };
}

/**
 * Create AI Gateway client from environment
 */
export function createAIGatewayClientFromEnv(
  config?: AIGatewayConfig
): ReturnType<typeof createAIGatewayClient> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
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
  return createAIGatewayClient(apiKey, config);
}

/**
 * AI Gateway client type
 */
export type AIGatewayClient = ReturnType<typeof createAIGatewayClient>;
