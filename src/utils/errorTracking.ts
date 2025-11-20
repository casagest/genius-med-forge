/**
 * Error Tracking and Reporting Utility
 * Captures and reports errors for monitoring and debugging
 */

import { config } from '@/config/env';
import { createLogger } from './logger';

const logger = createLogger('ErrorTracking');

export interface ErrorReport {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: number;
  url: string;
  userAgent: string;
  context?: Record<string, unknown>;
  componentStack?: string;
}

export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  lastError?: ErrorReport;
  errorsByType: Record<string, number>;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private errorCounts: Map<string, number> = new Map();
  private readonly maxStoredErrors = 100;
  private readonly enabled: boolean;
  private readonly reportEndpoint: string;

  constructor() {
    this.enabled = config.app.environment !== 'test';
    this.reportEndpoint = config.api.baseUrl + '/errors';

    if (this.enabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        level: 'error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        level: 'error',
        context: {
          reason: event.reason,
        },
      });
    });

    // Handle console errors (if needed)
    if (config.app.environment === 'production') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        this.captureError({
          message: args.map(arg => String(arg)).join(' '),
          level: 'error',
          context: { args },
        });
        originalConsoleError(...args);
      };
    }
  }

  /**
   * Capture error
   */
  captureError(options: {
    message: string;
    stack?: string;
    level?: 'error' | 'warning' | 'info';
    context?: Record<string, unknown>;
    componentStack?: string;
  }): void {
    const errorReport: ErrorReport = {
      message: options.message,
      stack: options.stack,
      level: options.level || 'error',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: options.context,
      componentStack: options.componentStack,
    };

    // Store error
    this.errors.push(errorReport);

    // Maintain max stored errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Track error count by message
    const errorKey = this.getErrorKey(errorReport);
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log error
    logger.error(errorReport.message, undefined, {
      stack: errorReport.stack,
      context: errorReport.context,
    });

    // Report error
    this.reportError(errorReport);
  }

  /**
   * Get error key for deduplication
   */
  private getErrorKey(error: ErrorReport): string {
    return `${error.message}:${error.stack?.split('\n')[0] || ''}`;
  }

  /**
   * Report error to backend
   */
  private async reportError(error: ErrorReport): Promise<void> {
    if (config.app.environment === 'test') return;

    // Store locally
    this.storeLocally(error);

    // Send to backend in production
    if (config.app.environment === 'production') {
      try {
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
          keepalive: true,
        });
      } catch (e) {
        // Silently fail - don't create infinite error loop
        console.warn('[ErrorTracking] Failed to report error:', e);
      }
    }
  }

  /**
   * Store error locally
   */
  private storeLocally(error: ErrorReport): void {
    const storageKey = 'error-reports';
    const stored = localStorage.getItem(storageKey);
    const errors = stored ? JSON.parse(stored) : [];

    errors.push(error);

    // Keep only last 50 errors
    if (errors.length > 50) {
      errors.shift();
    }

    localStorage.setItem(storageKey, JSON.stringify(errors));
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    return {
      totalErrors: this.errors.length,
      uniqueErrors: this.errorCounts.size,
      lastError: this.errors[this.errors.length - 1],
      errorsByType: this.getErrorsByType(),
    };
  }

  /**
   * Get errors grouped by type
   */
  private getErrorsByType(): Record<string, number> {
    const byType: Record<string, number> = {};

    for (const error of this.errors) {
      const type = this.classifyError(error.message);
      byType[type] = (byType[type] || 0) + 1;
    }

    return byType;
  }

  /**
   * Classify error by message
   */
  private classifyError(message: string): string {
    if (message.includes('Network') || message.includes('fetch')) return 'Network';
    if (message.includes('TypeError')) return 'Type Error';
    if (message.includes('ReferenceError')) return 'Reference Error';
    if (message.includes('Promise')) return 'Promise Rejection';
    if (message.includes('Loading')) return 'Loading Error';
    return 'Other';
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorReport[] {
    return this.errors;
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    this.errorCounts.clear();
    localStorage.removeItem('error-reports');
  }

  /**
   * Get error frequency
   */
  getErrorFrequency(error: ErrorReport): number {
    const errorKey = this.getErrorKey(error);
    return this.errorCounts.get(errorKey) || 0;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * React Hook for error tracking in components
 */
export function useErrorTracking(componentName: string) {
  return {
    trackError: (error: Error, errorInfo?: { componentStack?: string }) => {
      errorTracker.captureError({
        message: `[${componentName}] ${error.message}`,
        stack: error.stack,
        level: 'error',
        componentStack: errorInfo?.componentStack,
        context: {
          component: componentName,
        },
      });
    },
    trackWarning: (message: string, context?: Record<string, unknown>) => {
      errorTracker.captureError({
        message: `[${componentName}] ${message}`,
        level: 'warning',
        context: {
          component: componentName,
          ...context,
        },
      });
    },
  };
}

/**
 * Track fetch errors
 */
export async function trackFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      errorTracker.captureError({
        message: `HTTP Error: ${response.status} ${response.statusText}`,
        level: 'error',
        context: {
          url: typeof input === 'string' ? input : input.toString(),
          status: response.status,
          statusText: response.statusText,
        },
      });
    }

    return await response.json();
  } catch (error) {
    errorTracker.captureError({
      message: `Fetch Error: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      level: 'error',
      context: {
        url: typeof input === 'string' ? input : input.toString(),
      },
    });
    throw error;
  }
}

export default errorTracker;
