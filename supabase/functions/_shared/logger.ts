/**
 * Structured Logging Utility for Supabase Edge Functions
 *
 * Replaces console.log statements with structured logging
 * Provides log levels and environment-aware behavior
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

class EdgeLogger {
  private currentLevel: LogLevel;
  private context: string;

  constructor(context: string = 'EdgeFunction') {
    this.context = context;

    // Get log level from environment
    const envLogLevel = Deno.env.get('LOG_LEVEL') || 'info';
    this.currentLevel = LOG_LEVEL_MAP[envLogLevel.toLowerCase()] || LogLevel.INFO;

    // In production, default to WARN level
    const environment = Deno.env.get('ENVIRONMENT') || 'development';
    if (environment === 'production' && !Deno.env.get('LOG_LEVEL')) {
      this.currentLevel = LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatLog(level: string, message: string, meta?: Record<string, unknown>): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta && { meta }),
    };

    return JSON.stringify(logEntry);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog('INFO', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog('WARN', message, meta));
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMeta = error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...meta,
          }
        : { error, ...meta };

      console.error(this.formatLog('ERROR', message, errorMeta));
    }
  }
}

/**
 * Creates a logger for a specific context/function
 */
export function createLogger(context: string): EdgeLogger {
  return new EdgeLogger(context);
}

export default EdgeLogger;
