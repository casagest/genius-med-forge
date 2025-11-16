import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from "web-vitals";

interface VitalsReport {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

const vitalsThresholds = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

function getRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = vitalsThresholds[name as keyof typeof vitalsThresholds];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.needsImprovement) return "needs-improvement";
  return "poor";
}

function formatMetric(metric: Metric): VitalsReport {
  return {
    name: metric.name,
    value: Math.round(metric.value * 100) / 100,
    rating: getRating(metric.name, metric.value),
    delta: Math.round(metric.delta * 100) / 100,
    id: metric.id,
    navigationType: metric.navigationType,
  };
}

function sendToAnalytics(report: VitalsReport): void {
  // In production, send to your analytics service
  if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS === "true") {
    // Example: Google Analytics
    // gtag('event', report.name, {
    //   value: report.value,
    //   metric_rating: report.rating,
    //   metric_delta: report.delta,
    //   metric_id: report.id,
    //   non_interaction: true,
    // });

    // Example: Custom analytics endpoint
    // fetch('/api/analytics/vitals', {
    //   method: 'POST',
    //   body: JSON.stringify(report),
    //   headers: { 'Content-Type': 'application/json' },
    //   keepalive: true,
    // });

    console.log("[Analytics] Web Vital:", report);
  }
}

function logToConsole(report: VitalsReport): void {
  const colors = {
    good: "\x1b[32m", // Green
    "needs-improvement": "\x1b[33m", // Yellow
    poor: "\x1b[31m", // Red
  };
  const reset = "\x1b[0m";

  if (import.meta.env.DEV) {
    console.log(
      `${colors[report.rating]}[Web Vital] ${report.name}: ${report.value} (${report.rating})${reset}`
    );
  }
}

export function initWebVitals(): void {
  const handleMetric = (metric: Metric): void => {
    const report = formatMetric(metric);
    logToConsole(report);
    sendToAnalytics(report);

    // Store in performance buffer for debugging
    if (typeof window !== "undefined") {
      window.__WEB_VITALS__ = window.__WEB_VITALS__ || [];
      window.__WEB_VITALS__.push(report);
    }
  };

  // Core Web Vitals
  onCLS(handleMetric);
  onFID(handleMetric);
  onLCP(handleMetric);

  // Additional metrics
  onFCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);
}

// Performance monitoring utilities
export function measurePerformance(name: string, fn: () => void): void {
  if (typeof performance === "undefined") {
    fn();
    return;
  }

  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  // Mark for performance timeline
  performance.mark(`${name}-end`);
  performance.measure(name, { start, end });
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof performance === "undefined") {
    return fn();
  }

  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;

    if (import.meta.env.DEV) {
      console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`);
    }

    throw error;
  }
}

// Augment window type
declare global {
  interface Window {
    __WEB_VITALS__?: VitalsReport[];
  }
}
