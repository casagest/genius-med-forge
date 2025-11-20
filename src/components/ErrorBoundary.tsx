/**
 * Error Boundary Component
 *
 * Catches React component errors and provides graceful fallback UI
 * Prevents entire application from crashing due to component errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Class Component
 * Note: Error boundaries must be class components in React
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    logger.error('Error boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 mb-4">
                  An unexpected error occurred. Our team has been notified and is working on a fix.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <summary className="cursor-pointer font-semibold text-red-800 mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong className="text-red-900">Error:</strong>
                        <pre className="mt-1 text-sm text-red-800 whitespace-pre-wrap">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong className="text-red-900">Stack Trace:</strong>
                          <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-64">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong className="text-red-900">Component Stack:</strong>
                          <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-64">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex gap-3">
                  <Button onClick={this.handleReset} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                  >
                    Go to Home
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to use error boundary programmatically
 * Throws error that will be caught by nearest error boundary
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

/**
 * Specialized error boundary for async operations
 */
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">
              Failed to load content. Please try again.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary specifically for medical components
 * Provides medical-context-appropriate error messaging
 */
export function MedicalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <Card className="max-w-md w-full p-6 border-2 border-red-200">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Medical Component Error
              </h3>
              <p className="text-gray-600 mb-4">
                Unable to display medical information. This error has been logged for review.
              </p>
              <p className="text-sm text-red-600 font-medium mb-4">
                ⚠️ Please verify all patient data manually
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      }
      onError={(error, errorInfo) => {
        // Send to medical monitoring system
        logger.error('MEDICAL_COMPONENT_ERROR', error, {
          component: errorInfo.componentStack,
          severity: 'HIGH',
          requiresReview: true,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
