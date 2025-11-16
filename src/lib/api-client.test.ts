import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiClient,
  ApiError,
  NetworkError,
  TimeoutError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
} from "./api-client";

describe("API Client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Error Type Guards", () => {
    it("identifies ApiError correctly", () => {
      const error = new ApiError("Test", 404, "Not Found");
      expect(isApiError(error)).toBe(true);
      expect(isNetworkError(error)).toBe(false);
      expect(isTimeoutError(error)).toBe(false);
    });

    it("identifies NetworkError correctly", () => {
      const error = new NetworkError("Network failed");
      expect(isApiError(error)).toBe(false);
      expect(isNetworkError(error)).toBe(true);
      expect(isTimeoutError(error)).toBe(false);
    });

    it("identifies TimeoutError correctly", () => {
      const error = new TimeoutError("Timeout");
      expect(isApiError(error)).toBe(false);
      expect(isNetworkError(error)).toBe(false);
      expect(isTimeoutError(error)).toBe(true);
    });
  });

  describe("getErrorMessage", () => {
    it("returns friendly message for 401 error", () => {
      const error = new ApiError("Unauthorized", 401, "Unauthorized");
      expect(getErrorMessage(error)).toBe("Authentication required. Please log in.");
    });

    it("returns friendly message for 403 error", () => {
      const error = new ApiError("Forbidden", 403, "Forbidden");
      expect(getErrorMessage(error)).toBe("You don't have permission to perform this action.");
    });

    it("returns friendly message for 404 error", () => {
      const error = new ApiError("Not Found", 404, "Not Found");
      expect(getErrorMessage(error)).toBe("The requested resource was not found.");
    });

    it("returns friendly message for 429 error", () => {
      const error = new ApiError("Too Many Requests", 429, "Too Many Requests");
      expect(getErrorMessage(error)).toBe("Too many requests. Please try again later.");
    });

    it("returns friendly message for 500+ errors", () => {
      const error = new ApiError("Server Error", 500, "Internal Server Error");
      expect(getErrorMessage(error)).toBe("Server error. Please try again later.");
    });

    it("returns friendly message for network errors", () => {
      const error = new NetworkError("Failed to fetch");
      expect(getErrorMessage(error)).toBe("Network error. Please check your internet connection.");
    });

    it("returns friendly message for timeout errors", () => {
      const error = new TimeoutError("Request timed out");
      expect(getErrorMessage(error)).toBe("Request timed out. Please try again.");
    });

    it("returns original message for generic errors", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("returns default message for unknown errors", () => {
      expect(getErrorMessage("unknown")).toBe("An unexpected error occurred.");
    });
  });

  describe("ApiError", () => {
    it("stores all error information", () => {
      const error = new ApiError("Test error", 400, "Bad Request", { field: "value" }, "req-123");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.statusText).toBe("Bad Request");
      expect(error.data).toEqual({ field: "value" });
      expect(error.requestId).toBe("req-123");
      expect(error.name).toBe("ApiError");
    });
  });

  describe("NetworkError", () => {
    it("stores original error", () => {
      const originalError = new TypeError("Failed to fetch");
      const error = new NetworkError("Network failed", originalError);

      expect(error.message).toBe("Network failed");
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("TimeoutError", () => {
    it("creates timeout error", () => {
      const error = new TimeoutError("Request timed out after 30000ms");

      expect(error.message).toBe("Request timed out after 30000ms");
      expect(error.name).toBe("TimeoutError");
    });
  });

  describe("apiClient methods", () => {
    it("has get method", () => {
      expect(apiClient.get).toBeDefined();
      expect(typeof apiClient.get).toBe("function");
    });

    it("has post method", () => {
      expect(apiClient.post).toBeDefined();
      expect(typeof apiClient.post).toBe("function");
    });

    it("has put method", () => {
      expect(apiClient.put).toBeDefined();
      expect(typeof apiClient.put).toBe("function");
    });

    it("has patch method", () => {
      expect(apiClient.patch).toBeDefined();
      expect(typeof apiClient.patch).toBe("function");
    });

    it("has delete method", () => {
      expect(apiClient.delete).toBeDefined();
      expect(typeof apiClient.delete).toBe("function");
    });
  });
});
