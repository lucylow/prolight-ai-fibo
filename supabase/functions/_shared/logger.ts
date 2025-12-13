// Structured JSON logger for edge functions
// Provides consistent logging with request tracing

import { redactSecrets } from './config.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  requestId: string;
  event: string;
  duration_ms?: number;
  status?: number;
  error?: string;
  [key: string]: unknown;
}

class Logger {
  private functionName: string;
  private requestId: string;
  private startTime: number;

  constructor(functionName: string, requestId: string) {
    this.functionName = functionName;
    this.requestId = requestId;
    this.startTime = Date.now();
  }

  private log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      requestId: this.requestId,
      event,
      duration_ms: Date.now() - this.startTime,
      ...redactSecrets(data || {}),
    };

    const logFn = level === 'error' ? console.error : 
                  level === 'warn' ? console.warn : 
                  console.log;
    
    logFn(JSON.stringify(entry));
  }

  debug(event: string, data?: Record<string, unknown>): void {
    this.log('debug', event, data);
  }

  info(event: string, data?: Record<string, unknown>): void {
    this.log('info', event, data);
  }

  warn(event: string, data?: Record<string, unknown>): void {
    this.log('warn', event, data);
  }

  error(event: string, error?: Error | string, data?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.log('error', event, { 
      ...data, 
      error: errorMessage,
      stack: errorStack 
    });
  }

  /**
   * Log request completion with status
   */
  complete(status: number, data?: Record<string, unknown>): void {
    this.log('info', 'request.complete', { status, ...data });
  }
}

/**
 * Create a logger for a function invocation
 */
export function createLogger(functionName: string, requestId?: string): Logger {
  const id = requestId || crypto.randomUUID();
  return new Logger(functionName, id);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
