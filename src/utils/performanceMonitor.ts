/**
 * Performance Monitoring Utility
 * Tracks Web Vitals and custom performance metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { config } from '@/config/env';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  navigationType?: string;
}

export interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private customMetrics: CustomMetric[] = [];
  private readonly enabled: boolean;
  private readonly reportEndpoint: string;

  constructor() {
    this.enabled = config.app.environment !== 'test';
    this.reportEndpoint = config.api.baseUrl + '/performance';
  }

  /**
   * Initialize Web Vitals monitoring
   * Note: FID (First Input Delay) has been deprecated in web-vitals v4 in favor of INP
   */
  init(): void {
    if (!this.enabled) return;

    // Track Core Web Vitals
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));

    // Track custom metrics
    this.trackPageLoadTime();
    this.trackResourceLoadTime();
    this.trackChunkLoadTime();

    // Report metrics periodically
    this.scheduleReporting();
  }

  /**
   * Handle Web Vitals metric
   */
  private handleMetric(metric: Metric): void {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    };

    this.metrics.set(metric.name, performanceMetric);

    // Log metric in development
    if (config.app.environment === 'development') {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${Math.round(metric.value)}ms`,
        rating: metric.rating,
      });
    }

    // Send to analytics
    this.sendToAnalytics(performanceMetric);
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.customMetrics.push(metric);

    if (config.app.environment === 'development') {
      console.log(`[Performance] Custom: ${name}`, {
        value: `${Math.round(value)}ms`,
        metadata,
      });
    }

    this.sendToAnalytics({
      name: `custom.${name}`,
      value,
      rating: this.getRating(name, value),
    });
  }

  /**
   * Track page load time
   */
  private trackPageLoadTime(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigationTiming) {
        this.trackCustomMetric('pageLoad', navigationTiming.loadEventEnd - navigationTiming.fetchStart, {
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
          domInteractive: navigationTiming.domInteractive - navigationTiming.fetchStart,
        });
      }
    });
  }

  /**
   * Track resource load time
   */
  private trackResourceLoadTime(): void {
    if (typeof window === 'undefined') return;

    // Use PerformanceObserver for dynamic resource tracking
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Track JavaScript chunks
          if (resourceEntry.name.includes('.js') && resourceEntry.name.includes('assets')) {
            const chunkName = this.extractChunkName(resourceEntry.name);
            this.trackCustomMetric(`chunkLoad.${chunkName}`, resourceEntry.duration, {
              size: resourceEntry.transferSize,
              cached: resourceEntry.transferSize === 0,
            });
          }

          // Track CSS files
          if (resourceEntry.name.includes('.css')) {
            this.trackCustomMetric('cssLoad', resourceEntry.duration, {
              size: resourceEntry.transferSize,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Track chunk load time (for code splitting)
   */
  private trackChunkLoadTime(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();

      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      if (url.includes('.js') && url.includes('assets')) {
        const chunkName = this.extractChunkName(url);
        this.trackCustomMetric(`fetch.${chunkName}`, endTime - startTime);
      }

      return response;
    };
  }

  /**
   * Extract chunk name from URL
   */
  private extractChunkName(url: string): string {
    const match = url.match(/([^\/]+)-[a-zA-Z0-9]+\.js$/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get rating for custom metric
   */
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    // Define thresholds for different metrics
    const thresholds: Record<string, { good: number; poor: number }> = {
      pageLoad: { good: 2500, poor: 4000 },
      chunkLoad: { good: 500, poor: 1000 },
      cssLoad: { good: 300, poor: 600 },
      fetch: { good: 200, poor: 500 },
    };

    const baseMetricName = name.split('.')[0];
    const threshold = thresholds[baseMetricName] || thresholds.fetch;

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Send metric to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    if (config.app.environment === 'test') return;

    // In production, send to analytics service
    if (config.app.environment === 'production') {
      // Send to backend or analytics service (Google Analytics, Datadog, etc.)
      this.sendToBackend(metric);
    }

    // Store locally for development/debugging
    this.storeLocally(metric);
  }

  /**
   * Send to backend
   */
  private async sendToBackend(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          timestamp: Date.now(),
          environment: config.app.environment,
          userAgent: navigator.userAgent,
        }),
        // Use sendBeacon for better reliability
        keepalive: true,
      });
    } catch (error) {
      console.error('[Performance] Failed to send metric:', error);
    }
  }

  /**
   * Store metric locally
   */
  private storeLocally(metric: PerformanceMetric): void {
    const storageKey = 'performance-metrics';
    const stored = localStorage.getItem(storageKey);
    const metrics = stored ? JSON.parse(stored) : [];

    metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only last 50 metrics
    if (metrics.length > 50) {
      metrics.shift();
    }

    localStorage.setItem(storageKey, JSON.stringify(metrics));
  }

  /**
   * Schedule periodic reporting
   */
  private scheduleReporting(): void {
    // Report metrics every 30 seconds
    setInterval(() => {
      this.reportMetrics();
    }, 30000);

    // Report on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  /**
   * Report all collected metrics
   */
  private reportMetrics(): void {
    if (this.customMetrics.length === 0) return;

    const summary = {
      webVitals: Array.from(this.metrics.values()),
      customMetrics: this.customMetrics,
      timestamp: Date.now(),
      environment: config.app.environment,
    };

    if (config.app.environment === 'development') {
      console.log('[Performance] Metrics Summary:', summary);
    }

    // Send batch to backend
    if (config.app.environment === 'production') {
      navigator.sendBeacon(
        this.reportEndpoint + '/batch',
        JSON.stringify(summary)
      );
    }

    // Clear custom metrics after reporting
    this.customMetrics = [];
  }

  /**
   * Get current metrics
   */
  getMetrics(): Map<string, PerformanceMetric> {
    return this.metrics;
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): CustomMetric[] {
    return this.customMetrics;
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    webVitals: PerformanceMetric[];
    custom: CustomMetric[];
  } {
    return {
      webVitals: Array.from(this.metrics.values()),
      custom: this.customMetrics,
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize automatically
if (typeof window !== 'undefined') {
  performanceMonitor.init();
}

/**
 * React Hook for tracking component performance
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return {
    trackMount: () => {
      const mountTime = performance.now() - startTime;
      performanceMonitor.trackCustomMetric(`component.mount.${componentName}`, mountTime);
    },
    trackRender: () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.trackCustomMetric(`component.render.${componentName}`, renderTime);
    },
  };
}

/**
 * Decorator for tracking async operations
 */
export function trackAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  return operation().finally(() => {
    const duration = performance.now() - startTime;
    performanceMonitor.trackCustomMetric(`async.${operationName}`, duration);
  });
}

export default performanceMonitor;
