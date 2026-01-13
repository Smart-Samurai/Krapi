/**
 * SDK Error Utilities
 *
 * Provides comprehensive error handling utilities that leverage the SDK's
 * KrapiError and HttpError classes for rich error context and debugging.
 *
 * @module utils/error-utils
 */

import { KrapiError, HttpError, ErrorCode } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Error details extracted from any error type
 */
export interface ExtractedErrorDetails {
  /** Human-readable error message */
  message: string;
  /** SDK error code for programmatic handling */
  code: ErrorCode;
  /** HTTP status code */
  status: number;
  /** Additional error details/context */
  details: Record<string, unknown>;
  /** Request ID for tracking (if available) */
  requestId?: string | undefined;
  /** Timestamp of when error occurred */
  timestamp: string;
  /** Original error cause (if available) */
  cause?: string | undefined;
}

/**
 * Error response format for API responses
 */
export interface FormattedErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp?: string;
}

/**
 * Map of error message patterns to error codes
 */
const ERROR_MESSAGE_TO_CODE: Array<{ pattern: RegExp; code: ErrorCode }> = [
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
const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
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
 *
 * @param message - Error message to analyze
 * @returns Matching error code or INTERNAL_ERROR
 */
function getErrorCodeFromMessage(message: string): ErrorCode {
  for (const { pattern, code } of ERROR_MESSAGE_TO_CODE) {
    if (pattern.test(message)) {
      return code;
    }
  }
  return "INTERNAL_ERROR";
}

/**
 * Get HTTP status code from error code
 *
 * @param code - Error code
 * @returns HTTP status code
 */
function getStatusFromErrorCode(code: ErrorCode): number {
  return ERROR_CODE_TO_STATUS[code] || 500;
}

/**
 * Extract detailed error information from any error type
 *
 * Handles KrapiError, HttpError, standard Error, and unknown error types.
 * Extracts all available context for debugging and logging.
 *
 * @param error - Any error type
 * @returns Extracted error details with all available context
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const details = extractErrorDetails(error);
 *   console.log(`[${details.code}] ${details.message} (HTTP ${details.status})`);
 * }
 */
export function extractErrorDetails(error: unknown): ExtractedErrorDetails {
  const timestamp = new Date().toISOString();

  // Handle KrapiError (SDK's main error class)
  if (error instanceof KrapiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status || getStatusFromErrorCode(error.code),
      details: error.details || {},
      requestId: error.requestId,
      timestamp: error.timestamp || timestamp,
      cause: error.cause instanceof Error ? error.cause.message : error.cause ? String(error.cause) : undefined,
    };
  }

  // Handle HttpError (SDK's HTTP-specific error class)
  if (error instanceof HttpError) {
    const code = getErrorCodeFromMessage(error.message);
    return {
      message: error.getDetailedMessage ? error.getDetailedMessage() : error.message,
      code,
      status: error.status || getStatusFromErrorCode(code),
      details: {
        method: error.method,
        url: error.url,
        responseData: error.responseData,
        isApiError: error.isApiError,
        isNetworkError: error.isNetworkError,
        isAuthError: error.isAuthError,
      },
      timestamp,
    };
  }

  // Handle standard Error with potential SDK-like properties
  if (error instanceof Error) {
    // Check if it has KrapiError-like properties (duck typing)
    const krapiLike = error as Error & {
      code?: ErrorCode;
      status?: number;
      details?: Record<string, unknown>;
      requestId?: string;
      timestamp?: string;
    };

    if (krapiLike.code && typeof krapiLike.code === "string") {
      return {
        message: krapiLike.message,
        code: krapiLike.code as ErrorCode,
        status: krapiLike.status || getStatusFromErrorCode(krapiLike.code as ErrorCode),
        details: krapiLike.details || { stack: krapiLike.stack },
        requestId: krapiLike.requestId,
        timestamp: krapiLike.timestamp || timestamp,
      };
    }

    // Standard Error
    const code = getErrorCodeFromMessage(error.message);
    return {
      message: error.message,
      code,
      status: getStatusFromErrorCode(code),
      details: { stack: error.stack },
      timestamp,
    };
  }

  // Handle axios-style errors with response property
  if (typeof error === "object" && error !== null) {
    const axiosLike = error as {
      response?: { data?: { error?: string; message?: string; code?: string }; status?: number };
      message?: string;
    };

    if (axiosLike.response?.data) {
      const responseData = axiosLike.response.data;
      const message = responseData.error || responseData.message || axiosLike.message || "Unknown error";
      const code = (responseData.code as ErrorCode) || getErrorCodeFromMessage(message);
      return {
        message,
        code,
        status: axiosLike.response.status || getStatusFromErrorCode(code),
        details: responseData as Record<string, unknown>,
        timestamp,
      };
    }
  }

  // Handle string errors
  if (typeof error === "string") {
    const code = getErrorCodeFromMessage(error);
    return {
      message: error,
      code,
      status: getStatusFromErrorCode(code),
      details: {},
      timestamp,
    };
  }

  // Unknown error type
  return {
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    status: 500,
    details: { originalError: String(error) },
    timestamp,
  };
}

/**
 * Format error for API response
 *
 * Creates a consistent error response format for API endpoints.
 *
 * @param error - Any error type
 * @returns Formatted error response object
 *
 * @example
 * catch (error) {
 *   const response = formatErrorResponse(error);
 *   res.status(response.status).json(response);
 * }
 */
export function formatErrorResponse(error: unknown): FormattedErrorResponse & { status: number } {
  const details = extractErrorDetails(error);

  const response: FormattedErrorResponse & { status: number } = {
    success: false,
    error: details.message,
    code: details.code,
    status: details.status,
  };

  // Include details in development mode or if they contain useful info
  if (process.env.NODE_ENV === "development" && Object.keys(details.details).length > 0) {
    response.details = details.details;
  }

  if (details.requestId) {
    response.requestId = details.requestId;
  }

  response.timestamp = details.timestamp;

  return response;
}

/**
 * Log error with full context
 *
 * Logs error with all available SDK error details for debugging.
 *
 * @param context - Operation context (e.g., "createUser", "getProject")
 * @param error - Any error type
 *
 * @example
 * catch (error) {
 *   logError("createUser", error);
 *   // Logs: [ERROR][createUser][CONFLICT] A user with this email already exists (HTTP 409)
 * }
 */
export function logError(context: string, error: unknown): void {
  const details = extractErrorDetails(error);

  console.error(`[ERROR][${context}][${details.code}] ${details.message} (HTTP ${details.status})`);

  if (details.requestId) {
    console.error(`  Request ID: ${details.requestId}`);
  }

  if (details.cause) {
    console.error(`  Cause: ${details.cause}`);
  }

  if (Object.keys(details.details).length > 0) {
    console.error(`  Details:`, JSON.stringify(details.details, null, 2));
  }

  console.error(`  Timestamp: ${details.timestamp}`);
}

/**
 * Send error response with SDK error handling
 *
 * Extracts error details and sends a properly formatted response.
 *
 * @param res - Express response object
 * @param error - Any error type
 * @param context - Operation context for logging
 *
 * @example
 * catch (error) {
 *   sendSdkErrorResponse(res, error, "createUser");
 * }
 */
export function sendSdkErrorResponse(res: Response, error: unknown, context: string): void {
  logError(context, error);

  const formatted = formatErrorResponse(error);
  const { status, ...responseBody } = formatted;

  res.status(status).json(responseBody as ApiResponse);
}

/**
 * Check if error indicates a conflict (duplicate resource)
 *
 * @param error - Any error type
 * @returns True if error is a conflict/duplicate error
 */
export function isConflictError(error: unknown): boolean {
  const details = extractErrorDetails(error);
  return details.code === "CONFLICT" || details.status === 409;
}

/**
 * Check if error indicates resource not found
 *
 * @param error - Any error type
 * @returns True if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const details = extractErrorDetails(error);
  return details.code === "NOT_FOUND" || details.status === 404;
}

/**
 * Check if error indicates authentication failure
 *
 * @param error - Any error type
 * @returns True if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  const details = extractErrorDetails(error);
  return details.code === "UNAUTHORIZED" || details.code === "FORBIDDEN" || details.status === 401 || details.status === 403;
}

/**
 * Check if error indicates validation failure
 *
 * @param error - Any error type
 * @returns True if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const details = extractErrorDetails(error);
  return details.code === "VALIDATION_ERROR" || details.code === "BAD_REQUEST" || details.status === 400;
}

