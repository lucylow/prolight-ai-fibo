// Environment-aware configuration for edge functions
// Reads secrets from Deno.env (Lovable Cloud secrets)

export type Environment = 'development' | 'staging' | 'production';

export interface Config {
  env: Environment;
  lovableApiKey: string;
  briaApiToken?: string;
  comfyuiApiKey?: string;
  comfyuiUrl?: string;
  mcpApiKey?: string;
  mcpServerUrl?: string;
  analyticsEnabled: boolean;
}

/**
 * Get environment-aware configuration
 * Secrets are read from Lovable Cloud (Deno.env)
 */
export function getConfig(): Config {
  const env = (Deno.env.get('ENV') || Deno.env.get('ENVIRONMENT') || 'development') as Environment;
  
  // Select Bria token based on environment
  let briaApiToken: string | undefined;
  if (env === 'production') {
    briaApiToken = Deno.env.get('BRIA_API_TOKEN_PROD') || Deno.env.get('PRODUCTION');
  } else if (env === 'staging') {
    briaApiToken = Deno.env.get('BRIA_API_TOKEN_STAGING') || Deno.env.get('STAGING');
  }
  // Fallback to generic token
  briaApiToken = briaApiToken || Deno.env.get('BRIA_API_TOKEN');

  return {
    env,
    lovableApiKey: Deno.env.get('LOVABLE_API_KEY') || '',
    briaApiToken,
    comfyuiApiKey: Deno.env.get('COMFYUI_API_KEY') || Deno.env.get('COMFYUI'),
    comfyuiUrl: Deno.env.get('COMFYUI_URL'),
    mcpApiKey: Deno.env.get('MCP_API_KEY') || Deno.env.get('MCP'),
    mcpServerUrl: Deno.env.get('MCP_SERVER_URL'),
    analyticsEnabled: Deno.env.get('ANALYTICS_ENABLED') !== 'false',
  };
}

/**
 * Validate required configuration
 * Throws if required secrets are missing
 */
export function validateConfig(config: Config, required: (keyof Config)[]): void {
  const missing = required.filter(key => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}. Please configure secrets in Lovable Cloud.`);
  }
}

/**
 * Redact sensitive values from logs
 */
export function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['apikey', 'api_key', 'token', 'secret', 'password', 'authorization'];
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      redacted[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}
