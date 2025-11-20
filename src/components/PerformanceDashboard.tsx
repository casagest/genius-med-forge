/**
 * Performance Dashboard Component
 * Displays performance metrics and error stats in development mode
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { performanceMonitor, PerformanceMetric } from '@/utils/performanceMonitor';
import { errorTracker, ErrorReport } from '@/utils/errorTracking';
import { config } from '@/config/env';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Map<string, PerformanceMetric>>(new Map());
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development mode
  if (config.app.environment !== 'development') {
    return null;
  }

  useEffect(() => {
    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(new Map(performanceMonitor.getMetrics()));
      setErrors(errorTracker.getErrors());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatValue = (metric: PerformanceMetric) => {
    if (metric.name === 'CLS') {
      return metric.value.toFixed(3);
    }
    return `${Math.round(metric.value)}ms`;
  };

  const webVitals = Array.from(metrics.values()).filter(m =>
    ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'].includes(m.name)
  );

  const customMetrics = performanceMonitor.getCustomMetrics().slice(-10);

  const errorStats = errorTracker.getStats();

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(!isVisible)}
          variant="outline"
          className="shadow-lg"
        >
          {isVisible ? '📊 Hide Metrics' : '📊 Show Metrics'}
        </Button>
      </div>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 w-[600px] max-h-[600px] overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl border z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Performance Dashboard</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                ✕
              </Button>
            </div>

            <Tabs defaultValue="vitals">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
                <TabsTrigger value="custom">Custom Metrics</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>

              {/* Web Vitals Tab */}
              <TabsContent value="vitals" className="space-y-3">
                {webVitals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading metrics...</p>
                ) : (
                  webVitals.map((metric) => (
                    <Card key={metric.name}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {metric.name}
                          </CardTitle>
                          <Badge className={getRatingColor(metric.rating)}>
                            {metric.rating}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatValue(metric)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getMetricDescription(metric.name)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Custom Metrics Tab */}
              <TabsContent value="custom" className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-muted-foreground">
                    Latest {customMetrics.length} metrics
                  </p>
                </div>

                {customMetrics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No custom metrics yet</p>
                ) : (
                  <div className="space-y-2">
                    {customMetrics.map((metric, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{metric.name}</span>
                          <span className="text-sm font-mono">
                            {Math.round(metric.value)}ms
                          </span>
                        </div>
                        {metric.metadata && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(metric.metadata)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Errors Tab */}
              <TabsContent value="errors" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Error Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Errors:</span>
                      <span className="font-mono text-sm">{errorStats.totalErrors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unique Errors:</span>
                      <span className="font-mono text-sm">{errorStats.uniqueErrors}</span>
                    </div>
                  </CardContent>
                </Card>

                {errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No errors tracked 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {errors.slice(-5).reverse().map((error, index) => (
                      <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                              {error.message}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </p>
                            {error.stack && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-red-600">
                                  Stack Trace
                                </summary>
                                <pre className="text-xs mt-1 p-2 bg-red-100 dark:bg-red-900/40 rounded overflow-auto max-h-32">
                                  {error.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                          <Badge variant="destructive" className="ml-2">
                            {error.level}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {errors.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      errorTracker.clearErrors();
                      setErrors([]);
                    }}
                    className="w-full"
                  >
                    Clear Errors
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </>
  );
}

function getMetricDescription(name: string): string {
  const descriptions: Record<string, string> = {
    CLS: 'Cumulative Layout Shift - visual stability',
    FID: 'First Input Delay - interactivity',
    FCP: 'First Contentful Paint - loading',
    LCP: 'Largest Contentful Paint - loading',
    TTFB: 'Time to First Byte - server response',
    INP: 'Interaction to Next Paint - responsiveness',
  };
  return descriptions[name] || '';
}

export default PerformanceDashboard;
