/**
 * SDK Error Utilities for Frontend API Routes
 *
 * Provides comprehensive error handling utilities that leverage the SDK's
 * error classes for rich error context and consistent API responses.
 *
 * @module api/lib/error-utils
 */

import { NextResponse } from "next/server";

/**
 * Error details extracted from any error type
 */
export interface ExtractedErrorDetails {
  /** Human-readable error message */
  message: string;
  /** SDK error code for programmatic handling */
  code?: string;
  /** HTTP status code */
  status: number;
  /** Additional error details/context */
  details?: Record<string, unknown>;
  /** Request ID for tracking (if available) */
  requestId?: string;
  /** Timestamp of when error occurred */
  timestamp: string;
}

/**
 * Map of error message patterns to error codes
 */
const ERROR_MESSAGE_TO_CODE: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /already exists/i, code: "CONFLICT" },
  { pattern: /duplicate/i, code: "CONFLICT" },
  { pattern: /not found/i, code: "NOT_FOUND" },
  { pattern: /unauthorized|invalid.*token|session.*expired/i, code: "UNAUTHORIZED" },
  { pattern: /forbidden|permission|access denied/i, code: "FORBIDDEN" },
  { pattern: /validation|invalid|required|missing/i, code: "VALIDATION_ERROR" },
  { pattern: /rate limit|too many requests/i, code: "RATE_LIMIT_EXCEEDED" },
  { pattern: /timeout/i, code: "TIMEOUT" },
  { pattern: /network|connection|ECONNREFUSED|ECONNRESET/i, code: "NETWORK_ERROR" },
  { pattern: /bad request/i, code: "BAD_REQUEST" },
  { pattern: /service unavailable/i, code: "SERVICE_UNAVAILABLE" },
];

/**
 * Map of error codes to HTTP status codes
 */
const ERROR_CODE_TO_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMIT_EXCEEDED: 429,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 503,
  TIMEOUT: 504,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  REQUEST_ERROR: 400,
};

/**
 * Get error code from error message using pattern matching
 */
function getErrorCodeFromMessage(message: string): string {
  for (const { pattern, code } of ERROR_MESSAGE_TO_CODE) {
    if (pattern.test(message)) {
      return code;
    }
  }
  return "INTERNAL_ERROR";
}

/**
 * Get HTTP status code from error code
 */
function getStatusFromErrorCode(code: string): number {
  return ERROR_CODE_TO_STATUS[code] || 500;
}

/**
 * Extract detailed error information from any error type
 *
 * Handles SDK errors, axios errors, standard errors, and unknown types.
 * Extracts all available context for debugging and logging.
 *
 * @param error - Any error type
 * @returns Extracted error details with all available context
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const details = extractSdkError(error);
 *   console.log(`[${details.code}] ${details.message} (HTTP ${details.status})`);
 * }
 */
export function extractSdkError(error: unknown): ExtractedErrorDetails {
  const timestamp = new Date().toISOString();

  // Handle SDK KrapiError-like objects (duck typing)
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;

    // Check for KrapiError properties
    if (errorObj.code && typeof errorObj.code === "string") {
      return {
        message: (errorObj.message as string) || "An error occurred",
        code: errorObj.code as string,
        status: (errorObj.status as number) || getStatusFromErrorCode(errorObj.code as string),
        details: (errorObj.details as Record<string, unknown>) || undefined,
        requestId: errorObj.requestId as string | undefined,
        timestamp: (errorObj.timestamp as string) || timestamp,
      };
    }

    // Check for axios-style response errors
    if (errorObj.response && typeof errorObj.response === "object") {
      const response = errorObj.response as {
        data?: { error?: string; message?: string; code?: string; details?: Record<string, unknown> };
        status?: number;
      };

      if (response.data) {
        const message = response.data.error || response.data.message || (errorObj.message as string) || "Unknown error";
        const code = response.data.code || getErrorCodeFromMessage(message);
        return {
          message,
          code,
          status: response.status || getStatusFromErrorCode(code),
          details: response.data.details,
          timestamp,
        };
      }
    }

    // Check for HttpError-like properties
    if (errorObj.status !== undefined || errorObj.isApiError !== undefined) {
      const message = (errorObj.message as string) || "An error occurred";
      const code = getErrorCodeFromMessage(message);
      return {
        message,
        code,
        status: (errorObj.status as number) || getStatusFromErrorCode(code),
        details: {
          method: errorObj.method,
          url: errorObj.url,
          isApiError: errorObj.isApiError,
          isNetworkError: errorObj.isNetworkError,
        },
        timestamp,
      };
    }
  }

  // Handle standard Error
  if (error instanceof Error) {
    const code = getErrorCodeFromMessage(error.message);
    return {
      message: error.message,
      code,
      status: getStatusFromErrorCode(code),
      details: process.env.NODE_ENV === "development" ? { stack: error.stack } : undefined,
      timestamp,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    const code = getErrorCodeFromMessage(error);
    return {
      message: error,
      code,
      status: getStatusFromErrorCode(code),
      timestamp,
    };
  }

  // Unknown error type
  return {
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    status: 500,
    details: process.env.NODE_ENV === "development" ? { originalError: String(error) } : undefined,
    timestamp,
  };
}

/**
 * Create a NextResponse error response with SDK error handling
 *
 * Extracts error details and returns a properly formatted NextResponse.
 *
 * @param error - Any error type
 * @param defaultStatus - Default status code if not determined from error
 * @returns NextResponse with error details
 *
 * @example
 * catch (error) {
 *   return createErrorResponse(error, 500);
 * }
 */
export function createErrorResponse(error: unknown, defaultStatus = 500): NextResponse {
  const details = extractSdkError(error);
  const status = details.status || defaultStatus;

  // Log error for server-side debugging
  console.error(`[API ERROR][${details.code}] ${details.message} (HTTP ${status})`);
  if (details.details) {
    console.error(`  Details:`, JSON.stringify(details.details, null, 2));
  }

  // Build response body
  const responseBody: {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp: string;
  } = {
    success: false,
    error: details.message,
    timestamp: details.timestamp,
  };

  if (details.code) {
    responseBody.code = details.code;
  }

  // Include details in development mode
  if (process.env.NODE_ENV === "development" && details.details) {
    responseBody.details = details.details;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Log error with full context for frontend API routes
 *
 * @param context - Operation context (e.g., "createUser", "getProject")
 * @param error - Any error type
 */
export function logApiError(context: string, error: unknown): void {
  const details = extractSdkError(error);

  console.error(`[API ERROR][${context}][${details.code}] ${details.message} (HTTP ${details.status})`);

  if (details.requestId) {
    console.error(`  Request ID: ${details.requestId}`);
  }

  if (details.details && Object.keys(details.details).length > 0) {
    console.error(`  Details:`, JSON.stringify(details.details, null, 2));
  }

  console.error(`  Timestamp: ${details.timestamp}`);
}

/**
 * Check if error indicates a conflict (duplicate resource)
 */
export function isConflictError(error: unknown): boolean {
  const details = extractSdkError(error);
  return details.code === "CONFLICT" || details.status === 409;
}

/**
 * Check if error indicates resource not found
 */
export function isNotFoundError(error: unknown): boolean {
  const details = extractSdkError(error);
  return details.code === "NOT_FOUND" || details.status === 404;
}

/**
 * Check if error indicates authentication failure
 */
export function isAuthError(error: unknown): boolean {
  const details = extractSdkError(error);
  return details.code === "UNAUTHORIZED" || details.code === "FORBIDDEN" || details.status === 401 || details.status === 403;
}

/**
 * Check if error indicates validation failure
 */
export function isValidationError(error: unknown): boolean {
  const details = extractSdkError(error);
  return details.code === "VALIDATION_ERROR" || details.code === "BAD_REQUEST" || details.status === 400;
}



















