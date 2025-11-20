/**
 * Centralized Logging Utility
 * Provides structured logging with log levels and environment-aware behavior
 * Replaces console.log statements throughout the application
 */

import { config, isProduction } from '@/config/env';

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

class Logger {
  private currentLevel: LogLevel;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
    this.currentLevel = LOG_LEVEL_MAP[config.logging.level] || LogLevel.INFO;
  }

  /**
   * Creates a child logger with a specific context
   */
  createChild(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  /**
   * Debug level logging - development only
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, meta);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, meta);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, meta);
    }
  }

  /**
   * Error level logging
   */
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

      this.log('ERROR', message, errorMeta);
    }
  }

  /**
   * Determines if a log should be emitted based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  /**
   * Core logging function
   */
  private log(
    level: string,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(meta && { meta }),
    };

    // In production, you might want to send logs to a service like Sentry, LogRocket, etc.
    if (isProduction) {
      // Send to logging service (implement based on your needs)
      this.sendToLoggingService(logEntry);
    } else {
      // Development: pretty print to console
      const prefix = `[${timestamp}] [${level}] [${this.context}]`;

      switch (level) {
        case 'DEBUG':
          console.debug(prefix, message, meta || '');
          break;
        case 'INFO':
          console.info(prefix, message, meta || '');
          break;
        case 'WARN':
          console.warn(prefix, message, meta || '');
          break;
        case 'ERROR':
          console.error(prefix, message, meta || '');
          break;
      }
    }
  }

  /**
   * Sends logs to external logging service in production
   */
  private sendToLoggingService(logEntry: Record<string, unknown>): void {
    // Implement integration with your logging service here
    // Examples: Sentry, LogRocket, DataDog, CloudWatch, etc.

    // For now, just output to console in a structured way
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Default application logger
 */
export const logger = new Logger('GeniusMed');

/**
 * Creates a logger for a specific module
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Performance measurement utility
 */
export class PerformanceLogger {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(operation: string, context: string = 'Performance') {
    this.operation = operation;
    this.logger = new Logger(context);
    this.startTime = performance.now();
    this.logger.debug(`Starting: ${operation}`);
  }

  /**
   * Ends the performance measurement and logs the duration
   */
  end(meta?: Record<string, unknown>): void {
    const duration = performance.now() - this.startTime;
    this.logger.info(`Completed: ${this.operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...meta,
    });
  }
}

export default logger;
