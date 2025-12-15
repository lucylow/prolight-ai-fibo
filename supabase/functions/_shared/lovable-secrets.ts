/**
 * Enhanced Secret Management for Lovable Cloud Edge Functions
 * Provides environment-aware secret loading with validation and fallback support
 */

export interface SecretConfig {
  /** Primary secret name */
  primary: string;
  /** Alternative secret names (fallback order) */
  alternatives?: string[];
  /** Required - throws error if missing */
  required?: boolean;
  /** Default value if not found (only if not required) */
  defaultValue?: string;
  /** Validation function */
  validate?: (value: string) => boolean;
  /** Custom error message for validation failure */
  validationError?: string;
}

/**
 * Environment detection
 */
export function getEnvironment(): 'production' | 'staging' | 'development' {
  const env = Deno.env.get('NODE_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
  
  if (env === 'production' || env === 'prod') {
    return 'production';
  }
  if (env === 'staging' || env === 'stage') {
    return 'staging';
  }
  return 'development';
}

/**
 * Get secret with environment-aware priority
 */
export function getSecret(config: SecretConfig): string | null {
  const env = getEnvironment();
  const secretNames = [config.primary, ...(config.alternatives || [])];

  // Try primary and alternatives in order
  for (const secretName of secretNames) {
    const value = Deno.env.get(secretName);
    if (value && value.trim().length > 0) {
      // Validate if validator provided
      if (config.validate && !config.validate(value)) {
        const errorMsg = config.validationError || `Secret ${secretName} failed validation`;
        console.error(`[Secrets] Validation failed for ${secretName}: ${errorMsg}`);
        continue; // Try next alternative
      }
      
      console.log(`[Secrets] Loaded ${secretName} from environment ${env}`);
      return value;
    }
  }

  // Use default value if provided
  if (config.defaultValue !== undefined) {
    console.log(`[Secrets] Using default value for ${config.primary}`);
    return config.defaultValue;
  }

  // Throw error if required
  if (config.required !== false) {
    const errorMsg = `Required secret not found: ${config.primary}. Tried: ${secretNames.join(', ')}`;
    console.error(`[Secrets] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return null;
}

/**
 * Get Lovable API Key with environment-aware fallback
 */
export function getLovableApiKey(): string {
  const env = getEnvironment();
  
  const config: SecretConfig = {
    primary: 'LOVABLE_API_KEY',
    alternatives: env === 'production' 
      ? ['LOVABLE_API_KEY_PROD', 'PRODUCTION_API_KEY']
      : env === 'staging'
      ? ['LOVABLE_API_KEY_STAGING', 'STAGING_API_KEY']
      : ['LOVABLE_API_KEY_DEV', 'DEV_API_KEY'],
    required: true,
    validate: (value) => {
      // Basic validation - should not be placeholder
      return !value.includes('your_') && 
             !value.includes('placeholder') && 
             !value.includes('example') &&
             value.length > 10;
    },
    validationError: 'LOVABLE_API_KEY appears to be a placeholder or invalid',
  };

  return getSecret(config)!;
}

/**
 * Get BRIA API Key with environment-aware fallback
 */
export function getBriaApiKey(): string {
  const env = getEnvironment();
  
  const config: SecretConfig = {
    primary: env === 'production' ? 'BRIA_API_KEY_PROD' : 
             env === 'staging' ? 'BRIA_API_KEY_STAGING' : 
             'BRIA_API_KEY',
    alternatives: ['BRIA_API_TOKEN', 'BRIA_TOKEN'],
    required: true,
    validate: (value) => {
      return !value.includes('your_') && 
             !value.includes('placeholder') && 
             !value.includes('example') &&
             value.length > 10;
    },
    validationError: 'BRIA_API_KEY appears to be a placeholder or invalid',
  };

  return getSecret(config)!;
}

/**
 * Get Gemini API Key (optional)
 */
export function getGeminiApiKey(): string | null {
  const env = getEnvironment();
  
  const config: SecretConfig = {
    primary: env === 'production' ? 'GEMINI_API_KEY_PROD' : 
             env === 'staging' ? 'GEMINI_API_KEY_STAGING' : 
             'GEMINI_API_KEY',
    required: false,
    validate: (value) => {
      return !value.includes('your_') && 
             !value.includes('placeholder') && 
             value.length > 10;
    },
  };

  return getSecret(config);
}

/**
 * Validate all required secrets are present
 */
export function validateRequiredSecrets(): { valid: boolean; missing: string[]; errors: string[] } {
  const missing: string[] = [];
  const errors: string[] = [];
  const env = getEnvironment();

  try {
    getLovableApiKey();
  } catch (error) {
    missing.push('LOVABLE_API_KEY');
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    getBriaApiKey();
  } catch (error) {
    missing.push('BRIA_API_KEY');
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    valid: missing.length === 0,
    missing,
    errors,
  };
}

/**
 * Get all secrets for debugging (sanitized)
 */
export function getSecretsSummary(): Record<string, { present: boolean; length: number; sanitized: string }> {
  const env = getEnvironment();
  const secrets = {
    LOVABLE_API_KEY: Deno.env.get('LOVABLE_API_KEY'),
    BRIA_API_KEY: Deno.env.get('BRIA_API_KEY'),
    GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY'),
    NODE_ENV: Deno.env.get('NODE_ENV'),
    ENVIRONMENT: Deno.env.get('ENVIRONMENT'),
  };

  const summary: Record<string, { present: boolean; length: number; sanitized: string }> = {};

  for (const [key, value] of Object.entries(secrets)) {
    const present = !!value && value.trim().length > 0;
    const length = value?.length || 0;
    const sanitized = present 
      ? `${value!.substring(0, 4)}...${value!.substring(value!.length - 4)}`
      : 'not set';

    summary[key] = { present, length, sanitized };
  }

  return summary;
}

