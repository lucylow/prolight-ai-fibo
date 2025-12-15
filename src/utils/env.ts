/**
 * Environment Variable Validation
 * Ensures required environment variables are set
 */

/**
 * Validates required environment variables
 * @throws Error if required variables are missing in production
 */
export function validateEnv(): void {
  const required = [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_URL',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (import.meta.env.PROD) {
      throw new Error(message);
    } else {
      console.warn(`[DEV] ${message}`);
      console.warn('Some features may not work correctly without these variables.');
    }
  }
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
