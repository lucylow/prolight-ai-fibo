/**
 * Health Check Edge Function
 * Provides system health status, metrics, and secret validation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateRequiredSecrets, getSecretsSummary, getEnvironment } from "../_shared/lovable-secrets.ts";
import { getPerformanceMonitor } from "../_shared/performance-monitoring.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: getEnvironment(),
      version: '2.0.0',
    };

    // Validate secrets
    const secretValidation = validateRequiredSecrets();
    
    if (!secretValidation.valid) {
      healthStatus.status = 'unhealthy';
    }

    // Get secrets summary (sanitized)
    const secretsSummary = getSecretsSummary();

    // Get performance metrics
    let performanceReport = null;
    try {
      const monitor = getPerformanceMonitor();
      performanceReport = monitor.getReport(60000); // Last minute
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
    }

    // Build response
    const response: Record<string, unknown> = {
      ...healthStatus,
      secrets: {
        valid: secretValidation.valid,
        missing: secretValidation.missing,
        summary: detailed ? secretsSummary : undefined,
      },
    };

    if (detailed) {
      response.performance = performanceReport;
      response.system = {
        nodeEnv: Deno.env.get('NODE_ENV'),
        denoVersion: Deno.version.deno,
        timestamp: Date.now(),
      };
    }

    // Return appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(response, null, 2), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

