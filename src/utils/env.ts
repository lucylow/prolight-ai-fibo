/**
 * Environment Variable Validation
 * Ensures required environment variables are set
 */

/**
 * Validates required environment variables
 * Note: In Lovable builds, env vars may be set at runtime, so we only warn, never throw
 */
export function validateEnv(): void {
  const required = [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_URL',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    // Always warn, but never throw - Lovable may set env vars at runtime
    // Throwing would break the build process
    console.warn(`[ENV] ${message}`);
    console.warn('Some features may not work correctly without these variables.');
    console.warn('These can be set in Lovable project settings → Environment Variables.');
  }
}

/**
 * Gets Bria API token from environment
 */
export function getBriaApiToken(): string | undefined {
  return import.meta.env.VITE_BRIA_API_TOKEN || import.meta.env.BRIA_API_TOKEN;
}

/**
 * Gets Stripe publishable key with validation
 */
export function getStripePublishableKey(): string | undefined {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!key && import.meta.env.PROD) {
    console.error('VITE_STRIPE_PUBLISHABLE_KEY is required in production');
  }
  
  return key;
}

/**
 * Gets API base URL with fallback
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
}

/**
 * Gets Supabase URL with validation
 */
export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  
  if (!url) {
    console.warn('VITE_SUPABASE_URL is not set. Supabase features may not work.');
  }
  
  return url || '';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Gets OpenAI API key from environment
 */
export function getOpenAIApiKey(): string | undefined {
  return import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
}

/**
 * Gets Gemini API key from environment
 */
export function getGeminiApiKey(): string | undefined {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
}

