# Edge Functions and API Integration Improvements

## Overview

This document outlines the improvements made to the Lovable edge functions and API integration to enhance code quality, maintainability, and reliability.

## Key Improvements

### 1. Shared AI Gateway Client (`_shared/lovable-ai-gateway-client.ts`)

**Created a centralized client** for all Lovable AI Gateway API calls with:

- **Unified Error Handling**: Consistent error handling across all edge functions
- **Retry Logic**: Automatic retry with exponential backoff for transient failures
- **Type Safety**: Full TypeScript types for requests and responses
- **Response Validation**: Automatic validation of AI Gateway responses
- **Timeout Management**: Configurable timeouts with proper cleanup
- **Rate Limit Handling**: Automatic handling of rate limits with retry-after support

**Benefits:**
- Eliminates code duplication (removed ~200 lines of duplicate code per function)
- Consistent error messages and handling
- Easier to maintain and update API integration logic
- Better error reporting with structured error codes

### 2. Refactored Edge Functions

#### `natural-language-lighting`
- Replaced inline `makeAIRequest` function with shared client
- Reduced code complexity by ~150 lines
- Improved error handling with structured error responses
- Better logging and debugging capabilities

#### `generate-lighting`
- Replaced inline `makeAIRequest` function with shared client
- Reduced code complexity by ~200 lines
- Consistent error handling with other functions
- Improved retry logic for image generation

### 3. Enhanced Type Safety

- **Strong TypeScript Types**: All API requests and responses are fully typed
- **Interface Definitions**: Clear interfaces for all data structures
- **Type Guards**: Proper validation of response structures
- **Error Types**: Custom error classes with type-safe error codes

### 4. Improved Error Handling

**Error Categories:**
- `CONFIG_ERROR`: Missing or invalid API configuration
- `AI_AUTH_ERROR`: Authentication failures
- `AI_RATE_LIMIT`: Rate limiting with retry-after support
- `AI_PAYMENT_REQUIRED`: Payment/credit issues
- `AI_TIMEOUT`: Request timeouts
- `AI_NETWORK_ERROR`: Network connectivity issues
- `AI_SERVER_ERROR`: Server-side errors (retryable)
- `AI_CLIENT_ERROR`: Client-side errors
- `AI_INVALID_RESPONSE`: Invalid response structure
- `AI_NO_IMAGE`: Missing image in response

**Error Response Format:**
```typescript
{
  error: string;           // User-friendly error message
  errorCode: string;       // Machine-readable error code
  statusCode: number;      // HTTP status code
  details?: Record<string, unknown>;  // Additional error details
  retryable: boolean;      // Whether the error is retryable
  retryAfter?: number;     // Seconds to wait before retry
}
```

### 5. Better Retry Logic

**Features:**
- Exponential backoff for retries
- Configurable retry attempts and delays
- Automatic retry for transient errors (5xx, timeouts, network errors)
- Respects rate limit headers (`Retry-After`)
- No retry for client errors (4xx) except rate limits

**Configuration:**
```typescript
{
  timeout: 60000,      // Request timeout in ms
  retries: 2,          // Number of retry attempts
  retryDelay: 1000,    // Base delay between retries (exponential)
}
```

### 6. Response Validation

**Automatic Validation:**
- Validates response structure before processing
- Checks for required fields (choices, message, image_url)
- Retries on invalid responses (up to retry limit)
- Provides clear error messages for validation failures

## Usage Examples

### Using the Shared Client

```typescript
import { createAIGatewayClientFromEnv, AIGatewayErrorClass } from "../_shared/lovable-ai-gateway-client.ts";

// Initialize client
const aiClient = createAIGatewayClientFromEnv({
  timeout: 60000,
  retries: 2,
  retryDelay: 1000,
});

// Generate image
try {
  const result = await aiClient.generateImage(
    "Professional studio portrait with dramatic lighting",
    "google/gemini-2.5-flash-image-preview"
  );
  console.log("Image URL:", result.imageUrl);
  console.log("Text content:", result.textContent);
} catch (error) {
  if (error instanceof AIGatewayErrorClass) {
    // Handle structured error
    console.error("Error code:", error.errorCode);
    console.error("Retryable:", error.retryable);
    if (error.retryAfter) {
      console.log(`Retry after ${error.retryAfter} seconds`);
    }
  }
}

// Translate text
try {
  const result = await aiClient.translateText(
    "System prompt here",
    "User prompt here",
    "google/gemini-2.5-flash"
  );
  console.log("Translated:", result.textContent);
} catch (error) {
  // Handle error...
}
```

### Custom Chat Completions

```typescript
const result = await aiClient.chatCompletions({
  model: "google/gemini-2.5-flash",
  messages: [
    { role: "system", content: "You are a helpful assistant" },
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.7,
  max_tokens: 1000
});
```

## Migration Guide

### Before (Old Pattern)
```typescript
const makeAIRequest = async (endpoint, payload, retries = 2) => {
  // 200+ lines of error handling, retry logic, etc.
  // Duplicated in every function
};

const response = await makeAIRequest(
  "https://ai.gateway.lovable.dev/v1/chat/completions",
  payload
);
```

### After (New Pattern)
```typescript
import { createAIGatewayClientFromEnv } from "../_shared/lovable-ai-gateway-client.ts";

const aiClient = createAIGatewayClientFromEnv();
const result = await aiClient.generateImage(prompt, model);
```

## Benefits Summary

1. **Code Reduction**: ~400 lines of duplicate code removed
2. **Maintainability**: Single source of truth for API integration
3. **Reliability**: Better error handling and retry logic
4. **Type Safety**: Full TypeScript support
5. **Consistency**: Uniform error messages and behavior
6. **Debugging**: Better logging and error reporting
7. **Performance**: Optimized retry logic with exponential backoff

## Future Enhancements

Potential improvements for future iterations:

1. **Caching**: Add response caching for repeated requests
2. **Metrics**: Add request metrics and monitoring
3. **Circuit Breaker**: Implement circuit breaker pattern for resilience
4. **Request Queuing**: Add request queuing for rate limit management
5. **Batch Processing**: Support for batch API requests
6. **Streaming**: Support for streaming responses

## Testing

When testing the improved edge functions:

1. **Test Error Scenarios**: Verify all error codes are handled correctly
2. **Test Retry Logic**: Ensure retries work for transient failures
3. **Test Rate Limits**: Verify rate limit handling with retry-after
4. **Test Timeouts**: Ensure timeouts are handled gracefully
5. **Test Network Errors**: Verify network error recovery

## Notes

- All edge functions now use the shared client
- Backward compatibility maintained for API responses
- Error codes remain consistent with existing frontend error handling
- No breaking changes to function signatures or response formats

