# Performance Monitoring Strategy - GENIUS MedicalCor AI

## Overview

This document describes the comprehensive performance monitoring and error tracking system implemented to ensure optimal application performance, user experience, and rapid issue detection.

## Table of Contents

1. [Benefits](#benefits)
2. [Architecture](#architecture)
3. [Web Vitals Tracking](#web-vitals-tracking)
4. [Custom Metrics](#custom-metrics)
5. [Error Tracking](#error-tracking)
6. [Development Dashboard](#development-dashboard)
7. [Usage Guide](#usage-guide)
8. [Analytics Integration](#analytics-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Benefits

### Real-Time Performance Insights

✅ **Web Vitals Monitoring**
- Track Core Web Vitals: CLS, FID, FCP, LCP, TTFB, INP
- Automatic rating (good/needs-improvement/poor)
- Production-ready analytics integration

✅ **Custom Performance Metrics**
- Page load time tracking
- Chunk load time monitoring (code splitting)
- Resource load tracking (JS, CSS)
- Component render time tracking
- Async operation duration

✅ **Error Detection & Reporting**
- Global error handler
- Unhandled promise rejection tracking
- Error categorization and statistics
- Stack trace capture
- Context preservation

✅ **Development Tools**
- Real-time performance dashboard
- Visual metrics display
- Error log viewer
- Local storage persistence

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Components  │  │    Routes    │  │  Services │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Monitoring Infrastructure              │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ performanceMonitor│ │    errorTracker         │ │
│  │  - Web Vitals    │  │  - Global Handlers      │ │
│  │  - Custom Metrics│  │  - Error Categorization │ │
│  │  - Analytics     │  │  - Statistics           │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
  ┌─────────────────┐        ┌─────────────────┐
  │ Local Storage   │        │ Analytics API   │
  │ (Development)   │        │ (Production)    │
  └─────────────────┘        └─────────────────┘
```

### File Structure

```
src/
├── utils/
│   ├── performanceMonitor.ts    # Web Vitals & custom metrics
│   └── errorTracking.ts         # Error capture & reporting
├── components/
│   └── PerformanceDashboard.tsx # Development dashboard
└── main.tsx                     # Initialize monitoring
```

---

## Web Vitals Tracking

### Metrics Tracked

**Note**: As of web-vitals v4, FID (First Input Delay) has been deprecated and replaced with INP (Interaction to Next Paint), which provides a more comprehensive measure of responsiveness.

#### 1. Cumulative Layout Shift (CLS)
- **What**: Visual stability metric
- **Good**: ≤ 0.1
- **Needs Improvement**: ≤ 0.25
- **Poor**: > 0.25
- **Description**: Measures unexpected layout shifts

#### 2. First Contentful Paint (FCP)
- **What**: Loading metric
- **Good**: ≤ 1.8s
- **Needs Improvement**: ≤ 3s
- **Poor**: > 3s
- **Description**: Time until first content appears

#### 3. Largest Contentful Paint (LCP)
- **What**: Loading metric
- **Good**: ≤ 2.5s
- **Needs Improvement**: ≤ 4s
- **Poor**: > 4s
- **Description**: Time until largest content element renders

#### 4. Time to First Byte (TTFB)
- **What**: Server response metric
- **Good**: ≤ 800ms
- **Needs Improvement**: ≤ 1800ms
- **Poor**: > 1800ms
- **Description**: Time from request to first byte of response

#### 5. Interaction to Next Paint (INP)
- **What**: Responsiveness metric (replaces deprecated FID)
- **Good**: ≤ 200ms
- **Needs Improvement**: ≤ 500ms
- **Poor**: > 500ms
- **Description**: Time from interaction to visual update

### Implementation

**File**: `src/utils/performanceMonitor.ts`

```typescript
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

class PerformanceMonitor {
  init(): void {
    // Track all Core Web Vitals (5 metrics)
    // Note: FID deprecated in web-vitals v4, replaced with INP
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
  }

  private handleMetric(metric: Metric): void {
    // Log in development
    if (config.app.environment === 'development') {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${Math.round(metric.value)}ms`,
        rating: metric.rating,
      });
    }

    // Send to analytics
    this.sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }
}
```

---

## Custom Metrics

### Page Load Metrics

**1. Total Page Load Time**
```typescript
// Tracked automatically
this.trackCustomMetric('pageLoad', duration, {
  domContentLoaded: ...,
  domInteractive: ...,
});
```

**2. Chunk Load Time** (Code Splitting)
```typescript
// Tracks individual chunk loading
this.trackCustomMetric('chunkLoad.StrategicOpsPanel', duration, {
  size: transferSize,
  cached: transferSize === 0,
});
```

**3. Resource Load Time**
```typescript
// Tracks CSS, JS, and other resources
this.trackCustomMetric('cssLoad', duration, {
  size: transferSize,
});
```

### Component Performance

**Track Component Mount**
```typescript
import { usePerformanceTracking } from '@/utils/performanceMonitor';

function MyComponent() {
  const perf = usePerformanceTracking('MyComponent');

  useEffect(() => {
    perf.trackMount();
  }, []);

  return <div>...</div>;
}
```

**Track Component Render**
```typescript
function MyComponent() {
  const perf = usePerformanceTracking('MyComponent');

  useEffect(() => {
    perf.trackRender();
  });

  return <div>...</div>;
}
```

### Async Operations

**Track API Calls**
```typescript
import { trackAsyncOperation } from '@/utils/performanceMonitor';

async function fetchPatientData(id: string) {
  return trackAsyncOperation('fetchPatient', async () => {
    const response = await fetch(`/api/patients/${id}`);
    return response.json();
  });
}
```

**Track Any Async Operation**
```typescript
const result = await trackAsyncOperation('complexCalculation', async () => {
  // Your async code here
  return await performCalculation();
});
```

### Custom Metric Thresholds

| Metric Type | Good | Needs Improvement | Poor |
|-------------|------|-------------------|------|
| pageLoad | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| chunkLoad | ≤ 500ms | ≤ 1000ms | > 1000ms |
| cssLoad | ≤ 300ms | ≤ 600ms | > 600ms |
| fetch | ≤ 200ms | ≤ 500ms | > 500ms |
| component.mount | ≤ 100ms | ≤ 300ms | > 300ms |
| component.render | ≤ 16ms | ≤ 50ms | > 50ms |

---

## Error Tracking

### Error Capture

**File**: `src/utils/errorTracking.ts`

#### Global Error Handler
```typescript
window.addEventListener('error', (event) => {
  errorTracker.captureError({
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
```

#### Unhandled Promise Rejections
```typescript
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.captureError({
    message: `Unhandled Promise Rejection: ${event.reason}`,
    stack: event.reason?.stack,
    level: 'error',
    context: { reason: event.reason },
  });
});
```

### Manual Error Capture

**Capture Errors in Try-Catch**
```typescript
import { errorTracker } from '@/utils/errorTracking';

try {
  await riskyOperation();
} catch (error) {
  errorTracker.captureError({
    message: error.message,
    stack: error.stack,
    level: 'error',
    context: { operation: 'riskyOperation' },
  });
}
```

**Capture Warnings**
```typescript
errorTracker.captureError({
  message: 'User attempted unauthorized action',
  level: 'warning',
  context: { userId, action },
});
```

**Capture Info**
```typescript
errorTracker.captureError({
  message: 'Feature flag enabled',
  level: 'info',
  context: { feature: 'newDashboard' },
});
```

### React Error Tracking Hook

```typescript
import { useErrorTracking } from '@/utils/errorTracking';

function MyComponent() {
  const { captureError } = useErrorTracking('MyComponent');

  const handleSubmit = async () => {
    try {
      await submitForm();
    } catch (error) {
      captureError(error, { action: 'submit' });
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Error Statistics

The error tracker maintains statistics:
- **Total errors**: Count of all errors
- **Error frequency**: Errors per minute/hour
- **Error categories**: Count by error type
- **Recent errors**: Last 50 errors with full context

---

## Development Dashboard

### Overview

**File**: `src/components/PerformanceDashboard.tsx`

The Performance Dashboard provides real-time visibility into application performance during development.

### Features

1. **Web Vitals Tab**
   - Shows all 6 Core Web Vitals
   - Color-coded ratings (green/yellow/red)
   - Real-time updates

2. **Custom Metrics Tab**
   - Shows all custom performance metrics
   - Organized by category
   - Includes metadata (chunk size, cache status)

3. **Errors Tab**
   - Shows error log
   - Error level indicators
   - Stack traces
   - Error statistics

### Accessing the Dashboard

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Open application** in browser (http://localhost:8080)

3. **Click "📊 Show Metrics"** button (bottom-right corner)

4. **Explore tabs** to view different metrics

### Screenshot Example

```
┌─────────────────────────────────────────────────┐
│  Web Vitals  │ Custom Metrics │ Errors          │
├─────────────────────────────────────────────────┤
│                                                  │
│  CLS (Cumulative Layout Shift)                  │
│  Value: 0.05                                     │
│  Rating: good ✓                                  │
│                                                  │
│  LCP (Largest Contentful Paint)                 │
│  Value: 2,134 ms                                 │
│  Rating: good ✓                                  │
│                                                  │
│  FID (First Input Delay)                        │
│  Value: 87 ms                                    │
│  Rating: good ✓                                  │
│                                                  │
│  [6 more Web Vitals metrics...]                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Configuration

The dashboard **only appears in development mode**:

```typescript
if (config.app.environment !== 'development') {
  return null; // Dashboard hidden in production
}
```

To force visibility for testing:
```typescript
// Temporarily enable in staging
if (config.app.environment !== 'production') {
  return <PerformanceDashboard />;
}
```

---

## Usage Guide

### Setup (Already Complete)

1. **Install dependencies**
   ```bash
   npm install web-vitals
   ```

2. **Import in entry point** (`src/main.tsx`)
   ```typescript
   import './utils/performanceMonitor';
   import './utils/errorTracking';
   ```

3. **Add dashboard** to App (`src/App.tsx`)
   ```typescript
   import { PerformanceDashboard } from "@/components/PerformanceDashboard";

   const App = () => (
     <ErrorBoundary>
       {/* ... app content ... */}
       <PerformanceDashboard />
     </ErrorBoundary>
   );
   ```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Open dashboard**: Click "📊 Show Metrics" button
3. **Navigate app**: Perform user actions
4. **Monitor metrics**: Watch real-time updates
5. **Check errors**: Review error tab for issues
6. **Optimize**: Address poor-rated metrics

### Production Monitoring

In production, metrics are automatically sent to analytics:

```typescript
// Sent to backend endpoint
POST /api/performance
{
  metric: {
    name: "LCP",
    value: 2134,
    rating: "good"
  },
  timestamp: 1700123456789,
  environment: "production",
  userAgent: "Mozilla/5.0..."
}
```

### Local Metrics Storage

Metrics are stored in `localStorage` for debugging:

```javascript
// Access stored metrics in browser console
const metrics = JSON.parse(localStorage.getItem('performance-metrics'));
console.table(metrics);

const errors = JSON.parse(localStorage.getItem('error-tracking'));
console.table(errors);
```

---

## Analytics Integration

### Backend Endpoint Setup

**Required Endpoints**:

1. **Individual Metric Reporting**
   ```
   POST /api/performance
   Content-Type: application/json

   {
     "metric": {
       "name": "LCP",
       "value": 2134,
       "rating": "good",
       "delta": 120
     },
     "timestamp": 1700123456789,
     "environment": "production",
     "userAgent": "Mozilla/5.0..."
   }
   ```

2. **Batch Metric Reporting**
   ```
   POST /api/performance/batch
   Content-Type: application/json

   {
     "webVitals": [...],
     "customMetrics": [...],
     "timestamp": 1700123456789,
     "environment": "production"
   }
   ```

3. **Error Reporting**
   ```
   POST /api/errors
   Content-Type: application/json

   {
     "message": "TypeError: Cannot read property 'id' of undefined",
     "stack": "Error: ...\n  at Component.render ...",
     "level": "error",
     "timestamp": 1700123456789,
     "context": {...},
     "userAgent": "Mozilla/5.0..."
   }
   ```

### Third-Party Analytics

#### Google Analytics
```typescript
// src/utils/performanceMonitor.ts
private sendToAnalytics(metric: PerformanceMetric): void {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.delta,
    });
  }
}
```

#### Datadog RUM
```typescript
import { datadogRum } from '@datadog/browser-rum';

private sendToAnalytics(metric: PerformanceMetric): void {
  datadogRum.addTiming(metric.name, metric.value);
}
```

#### Sentry
```typescript
import * as Sentry from '@sentry/react';

errorTracker.captureError({
  message: error.message,
  stack: error.stack,
  level: 'error',
});

// Sentry integration
Sentry.captureException(error);
```

### Configuration

**Environment Variables** (`.env`):
```bash
# Analytics
VITE_ANALYTICS_ENABLED=true
VITE_PERFORMANCE_ENDPOINT=https://api.genius-medical.com/performance
VITE_ERROR_ENDPOINT=https://api.genius-medical.com/errors

# Third-party services
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_DATADOG_APPLICATION_ID=xxxxx-xxxxx-xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**Config File** (`src/config/env.ts`):
```typescript
export const config = {
  analytics: {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
    performanceEndpoint: import.meta.env.VITE_PERFORMANCE_ENDPOINT,
    errorEndpoint: import.meta.env.VITE_ERROR_ENDPOINT,
  },
};
```

---

## Best Practices

### 1. When to Track Custom Metrics

✅ **DO track**:
- Critical user journeys (login, checkout, booking)
- Heavy computational operations
- API calls and data fetching
- Component mount times for key features
- Chunk load times (code splitting)
- Export/report generation
- 3D visualization rendering

❌ **DON'T track**:
- Every single component render
- Trivial operations (<10ms)
- Non-critical background tasks
- Utility function calls

### 2. Error Tracking Best Practices

**Always provide context**:
```typescript
// ✅ Good
errorTracker.captureError({
  message: error.message,
  stack: error.stack,
  level: 'error',
  context: {
    userId: currentUser.id,
    patientId: patient.id,
    action: 'updateMedicalHistory',
    attemptNumber: retryCount,
  },
});

// ❌ Bad
errorTracker.captureError({
  message: error.message,
});
```

**Use appropriate error levels**:
- `error`: Actual errors that prevent functionality
- `warning`: Issues that don't break functionality but need attention
- `info`: Informational logging for tracking

### 3. Performance Optimization

**Debounce high-frequency tracking**:
```typescript
// For scroll, mousemove, resize events
const trackScroll = debounce(() => {
  performanceMonitor.trackCustomMetric('scrollDepth', scrollPercentage);
}, 1000);

window.addEventListener('scroll', trackScroll);
```

**Batch analytics calls**:
```typescript
// Metrics are automatically batched every 30 seconds
// Or on page visibility change / unload
```

**Use requestIdleCallback**:
```typescript
// Track non-critical metrics during idle time
requestIdleCallback(() => {
  performanceMonitor.trackCustomMetric('backgroundSync', duration);
});
```

### 4. Data Retention

**Local Storage**:
- Keep last 50 metrics
- Keep last 50 errors
- Clear old data automatically

**Backend**:
- Aggregate metrics daily
- Keep raw data for 30 days
- Keep aggregates for 1 year

### 5. Privacy Considerations

**Never track**:
- Personal health information (PHI)
- Passwords or credentials
- Full API responses with patient data
- Personally identifiable information (PII)

**Sanitize error messages**:
```typescript
function sanitizeError(message: string): string {
  // Remove potential PHI/PII from error messages
  return message
    .replace(/email=\S+/g, 'email=REDACTED')
    .replace(/id=\d+/g, 'id=REDACTED')
    .replace(/patient_id=\d+/g, 'patient_id=REDACTED');
}
```

---

## Troubleshooting

### Issue: Metrics Not Appearing

**Symptoms**:
- Dashboard shows "No metrics available"
- Console has no performance logs

**Solutions**:
1. Check environment mode:
   ```javascript
   // In browser console
   console.log(import.meta.env.MODE); // Should be 'development'
   ```

2. Verify initialization:
   ```javascript
   // In browser console
   import { performanceMonitor } from '@/utils/performanceMonitor';
   console.log(performanceMonitor.getMetrics());
   ```

3. Check browser support:
   ```javascript
   // Web Vitals requires modern browser
   console.log('PerformanceObserver' in window); // Should be true
   ```

### Issue: Dashboard Not Visible

**Symptoms**:
- "📊 Show Metrics" button missing

**Solutions**:
1. Verify environment:
   ```typescript
   // Should be 'development', not 'production'
   config.app.environment === 'development'
   ```

2. Check component import:
   ```typescript
   // In src/App.tsx
   import { PerformanceDashboard } from "@/components/PerformanceDashboard";
   ```

3. Check component rendering:
   ```typescript
   // Should be inside ErrorBoundary
   <PerformanceDashboard />
   ```

### Issue: Analytics Not Sending

**Symptoms**:
- Metrics appear locally but not in analytics dashboard
- Network tab shows no POST requests to analytics endpoint

**Solutions**:
1. Check environment:
   ```javascript
   // Analytics only send in production
   config.app.environment === 'production'
   ```

2. Verify endpoint configuration:
   ```javascript
   console.log(config.api.baseUrl); // Should be valid URL
   ```

3. Check network errors:
   ```javascript
   // Open Network tab, filter by '/performance'
   // Look for failed requests (CORS, 404, 500, etc.)
   ```

4. Verify CORS settings on backend:
   ```
   Access-Control-Allow-Origin: https://genius-medical.com
   Access-Control-Allow-Methods: POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```

### Issue: High Performance Overhead

**Symptoms**:
- Application feels slower after adding monitoring
- High CPU usage in browser

**Solutions**:
1. Disable tracking in performance-critical paths:
   ```typescript
   if (config.monitoring.enabled && !isPerformanceCritical) {
     performanceMonitor.trackCustomMetric(...);
   }
   ```

2. Increase reporting interval:
   ```typescript
   // In performanceMonitor.ts
   // Change from 30s to 60s
   setInterval(() => this.reportMetrics(), 60000);
   ```

3. Reduce stored metrics:
   ```typescript
   // Keep only last 20 instead of 50
   if (metrics.length > 20) {
     metrics.shift();
   }
   ```

### Issue: localStorage Quota Exceeded

**Symptoms**:
- Error: "QuotaExceededError: DOM Exception 22"

**Solutions**:
1. Clear old metrics:
   ```javascript
   localStorage.removeItem('performance-metrics');
   localStorage.removeItem('error-tracking');
   ```

2. Reduce retention:
   ```typescript
   // Keep fewer metrics
   if (metrics.length > 20) {
     metrics.splice(0, metrics.length - 20);
   }
   ```

---

## Monitoring Checklist

### Development Phase

- [ ] Performance dashboard visible
- [ ] Web Vitals appearing in dashboard
- [ ] Custom metrics tracking correctly
- [ ] Errors captured and displayed
- [ ] No console errors from monitoring code
- [ ] localStorage working correctly

### Pre-Production

- [ ] Analytics endpoint configured
- [ ] Error reporting endpoint configured
- [ ] Environment variables set
- [ ] CORS configured on backend
- [ ] Test metrics sending to backend
- [ ] Verify dashboard hidden in production

### Production Monitoring

- [ ] Check analytics dashboard daily
- [ ] Monitor error rates
- [ ] Track Web Vitals trends
- [ ] Investigate poor-rated metrics
- [ ] Review error logs for patterns
- [ ] Set up alerts for critical metrics

---

## Metrics Targets

### Web Vitals Goals

| Metric | Current Target | Stretch Goal |
|--------|---------------|--------------|
| CLS | ≤ 0.1 | ≤ 0.05 |
| FCP | ≤ 1.8s | ≤ 1.0s |
| LCP | ≤ 2.5s | ≤ 1.5s |
| TTFB | ≤ 800ms | ≤ 400ms |
| INP | ≤ 200ms | ≤ 100ms |

### Custom Metrics Goals

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load | < 3s | Total page load time |
| Chunk Load | < 500ms | Per-chunk load time |
| API Response | < 300ms | Average API call duration |
| Component Mount | < 100ms | Critical components only |
| Error Rate | < 1% | Errors per session |

---

## Resources

- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [MDN Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [React Performance](https://react.dev/learn/render-and-commit)

---

## Summary

### Implementation Overview

✅ **Web Vitals Tracking**
- All 5 Core Web Vitals monitored (CLS, FCP, LCP, TTFB, INP)
- Automatic rating calculation
- Real-time updates
- Note: FID deprecated in web-vitals v4, replaced with INP

✅ **Custom Performance Metrics**
- Page load time
- Chunk load time (code splitting)
- Resource load time
- Component performance
- Async operation tracking

✅ **Error Tracking**
- Global error handlers
- Unhandled promise rejections
- Error categorization
- Stack trace capture
- Error statistics

✅ **Development Dashboard**
- Real-time metrics display
- Three-tab interface (Web Vitals, Custom, Errors)
- Color-coded ratings
- Only visible in development

✅ **Analytics Integration**
- Backend reporting endpoints
- Batch metric reporting
- Local storage fallback
- Production-ready

### Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `src/utils/performanceMonitor.ts` | Created | Web Vitals & custom metrics tracking |
| `src/utils/errorTracking.ts` | Created | Error capture & reporting |
| `src/components/PerformanceDashboard.tsx` | Created | Development metrics dashboard |
| `src/main.tsx` | Modified | Initialize monitoring utilities |
| `src/App.tsx` | Modified | Add PerformanceDashboard component |
| `package.json` | Modified | Add web-vitals dependency |

### Key Metrics

| Aspect | Status |
|--------|--------|
| Web Vitals Tracked | 5/5 (CLS, FCP, LCP, TTFB, INP) |
| Custom Metrics | 10+ tracked |
| Error Handling | Global + manual capture |
| Development Tools | Real-time dashboard |
| Production Ready | Yes (analytics integration) |

---

**Last Updated**: November 20, 2024
**Implementation Version**: 1.0.0
**Dependencies**: web-vitals@4.2.4
