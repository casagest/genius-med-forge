import { config } from "./env";

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retry?: RetryOptions;
}

class ApiError extends Error {
  public readonly statusCode: number;
  public readonly statusText: string;
  public readonly data: unknown;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    statusText: string,
    data?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.data = data;
    this.requestId = requestId;
  }
}

class NetworkError extends Error {
  public readonly originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "NetworkError";
    this.originalError = originalError;
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TimeoutError) return true;
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    // Retry on server errors and specific client errors
    return (
      error.statusCode >= 500 ||
      error.statusCode === 408 ||
      error.statusCode === 429
    );
  }
  return false;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Request timeout after ${timeoutMs}ms`);
    }
    throw new NetworkError("Network request failed", error);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = config.performance.apiTimeout,
    retry = {},
    ...fetchOptions
  } = options;

  const {
    maxRetries = config.performance.maxRetries,
    retryDelay = config.performance.retryDelay,
    shouldRetry = isRetryableError,
  } = retry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * delay;
        await sleep(delay + jitter);

        if (config.app.isDev) {
          console.log(`[API] Retry attempt ${attempt}/${maxRetries} for ${url}`);
        }
      }

      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      if (!response.ok) {
        const requestId = response.headers.get("x-request-id") ?? undefined;
        let errorData: unknown;

        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        throw new ApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText,
          errorData,
          requestId
        );
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
    }
  }

  throw lastError;
}

// Typed API client methods
export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    fetchWithRetry<T>(url, { ...options, method: "GET" }),

  post: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithRetry<T>(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithRetry<T>(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithRetry<T>(url, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, options?: RequestOptions) =>
    fetchWithRetry<T>(url, { ...options, method: "DELETE" }),
};

// Error type guards
export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

export const isTimeoutError = (error: unknown): error is TimeoutError =>
  error instanceof TimeoutError;

// Error message helper
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.statusCode === 401) return "Authentication required. Please log in.";
    if (error.statusCode === 403) return "You don't have permission to perform this action.";
    if (error.statusCode === 404) return "The requested resource was not found.";
    if (error.statusCode === 429) return "Too many requests. Please try again later.";
    if (error.statusCode >= 500) return "Server error. Please try again later.";
    return error.message;
  }

  if (isNetworkError(error)) {
    return "Network error. Please check your internet connection.";
  }

  if (isTimeoutError(error)) {
    return "Request timed out. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export { ApiError, NetworkError, TimeoutError };
