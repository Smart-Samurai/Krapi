/**
 * SDK Error Utilities for Test Suite
 *
 * Provides comprehensive error extraction and formatting utilities
 * that leverage the SDK's error classes for detailed test failure diagnostics.
 *
 * @module error-utils
 */

/**
 * Map of error message patterns to error codes
 */
const ERROR_MESSAGE_TO_CODE = [
  { pattern: /already exists/i, code: "CONFLICT" },
  { pattern: /duplicate/i, code: "CONFLICT" },
  { pattern: /not found/i, code: "NOT_FOUND" },
  {
    pattern: /unauthorized|invalid.*token|session.*expired/i,
    code: "UNAUTHORIZED",
  },
  { pattern: /forbidden|permission|access denied/i, code: "FORBIDDEN" },
  { pattern: /validation|invalid|required|missing/i, code: "VALIDATION_ERROR" },
  { pattern: /rate limit|too many requests/i, code: "RATE_LIMIT_EXCEEDED" },
  { pattern: /timeout/i, code: "TIMEOUT" },
  {
    pattern: /network|connection|ECONNREFUSED|ECONNRESET/i,
    code: "NETWORK_ERROR",
  },
  { pattern: /bad request/i, code: "BAD_REQUEST" },
  { pattern: /service unavailable/i, code: "SERVICE_UNAVAILABLE" },
];

/**
 * Map of error codes to HTTP status codes
 */
const ERROR_CODE_TO_STATUS = {
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
 * @param {string} message - Error message to analyze
 * @returns {string} Matching error code or INTERNAL_ERROR
 */
function getErrorCodeFromMessage(message) {
  if (!message || typeof message !== "string") {
    return "INTERNAL_ERROR";
  }
  for (const { pattern, code } of ERROR_MESSAGE_TO_CODE) {
    if (pattern.test(message)) {
      return code;
    }
  }
  return "INTERNAL_ERROR";
}

/**
 * Get HTTP status code from error code
 * @param {string} code - Error code
 * @returns {number} HTTP status code
 */
function getStatusFromErrorCode(code) {
  return ERROR_CODE_TO_STATUS[code] || 500;
}

/**
 * Extract detailed error information from any error type
 *
 * Handles SDK KrapiError, HttpError, axios errors, standard errors, and unknown types.
 * Extracts all available context for comprehensive test failure diagnostics.
 *
 * @param {unknown} error - Any error type
 * @returns {Object} Extracted error details
 */
function extractTestErrorDetails(error) {
  const timestamp = new Date().toISOString();

  // Handle null/undefined
  if (error == null) {
    return {
      message: "Unknown error (null or undefined)",
      code: "INTERNAL_ERROR",
      status: 500,
      details: {},
      timestamp,
    };
  }

  // Handle KrapiError (SDK's main error class) - check for toJSON method
  if (error.toJSON && typeof error.toJSON === "function") {
    try {
      const jsonError = error.toJSON();
      return {
        message: jsonError.message || error.message || "Unknown error",
        code: jsonError.code || getErrorCodeFromMessage(error.message),
        status:
          jsonError.status ||
          getStatusFromErrorCode(jsonError.code || "INTERNAL_ERROR"),
        details: jsonError.details || {},
        requestId: jsonError.request_id,
        timestamp: jsonError.timestamp || timestamp,
        cause: jsonError.cause,
        originalError: error,
      };
    } catch {
      // Fall through to other checks if toJSON fails
    }
  }

  // Handle SDK KrapiError-like objects (duck typing)
  if (
    error &&
    typeof error === "object" &&
    error.code &&
    typeof error.code === "string"
  ) {
    return {
      message: error.message || "An error occurred",
      code: error.code,
      status: error.status || getStatusFromErrorCode(error.code),
      details: error.details || {},
      requestId: error.requestId,
      timestamp: error.timestamp || timestamp,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
      originalError: error,
    };
  }

  // Handle axios-style response errors
  if (error && typeof error === "object" && error.response) {
    const response = error.response;
    const responseData = response.data || {};

    const message =
      responseData.error ||
      responseData.message ||
      error.message ||
      "Unknown error";
    const code = responseData.code || getErrorCodeFromMessage(message);

    return {
      message,
      code,
      status: response.status || getStatusFromErrorCode(code),
      details: {
        responseData,
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        requestData: error.config?.data,
      },
      timestamp,
      originalError: error,
    };
  }

  // Handle HttpError-like properties (SDK HTTP errors)
  if (
    error &&
    typeof error === "object" &&
    (error.status !== undefined || error.isApiError !== undefined)
  ) {
    const message = error.message || "An error occurred";
    const code = error.code || getErrorCodeFromMessage(message);

    return {
      message: error.getDetailedMessage ? error.getDetailedMessage() : message,
      code,
      status: error.status || getStatusFromErrorCode(code),
      details: {
        method: error.method,
        url: error.url,
        responseData: error.responseData,
        isApiError: error.isApiError,
        isNetworkError: error.isNetworkError,
        isAuthError: error.isAuthError,
        isClientError: error.isClientError,
        isServerError: error.isServerError,
      },
      timestamp,
      originalError: error,
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    const code = getErrorCodeFromMessage(error.message);
    return {
      message: error.message,
      code,
      status: getStatusFromErrorCode(code),
      details: {
        name: error.name,
        stack: error.stack,
      },
      timestamp,
      originalError: error,
    };
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
    message: String(error),
    code: "INTERNAL_ERROR",
    status: 500,
    details: { originalType: typeof error, originalValue: error },
    timestamp,
  };
}

/**
 * Format error details for test log output
 *
 * Creates a detailed, human-readable error log for test failures.
 *
 * @param {string} testName - Name of the failed test
 * @param {unknown} error - The error that caused the failure
 * @returns {string} Formatted error log
 */
function formatTestErrorLog(testName, error) {
  const details = extractTestErrorDetails(error);

  const lines = [
    "",
    "═".repeat(70),
    `TEST FAILURE: ${testName}`,
    "═".repeat(70),
    "",
    `Error Code:    ${details.code}`,
    `HTTP Status:   ${details.status}`,
    `Message:       ${details.message}`,
    `Timestamp:     ${details.timestamp}`,
  ];

  if (details.requestId) {
    lines.push(`Request ID:    ${details.requestId}`);
  }

  if (details.cause) {
    lines.push(`Cause:         ${details.cause}`);
  }

  // Add details if present and non-empty
  if (details.details && Object.keys(details.details).length > 0) {
    // Filter out null/undefined values and stack traces for cleaner output
    const cleanDetails = {};
    for (const [key, value] of Object.entries(details.details)) {
      if (value != null && key !== "stack") {
        cleanDetails[key] = value;
      }
    }

    if (Object.keys(cleanDetails).length > 0) {
      lines.push("");
      lines.push("Details:");
      lines.push(
        JSON.stringify(cleanDetails, null, 2)
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")
      );
    }
  }

  // Add stack trace for debugging (shortened)
  if (details.details?.stack) {
    lines.push("");
    lines.push("Stack Trace (first 5 lines):");
    const stackLines = details.details.stack.split("\n").slice(0, 6);
    lines.push(stackLines.map((l) => `  ${l}`).join("\n"));
  }

  lines.push("");
  lines.push("─".repeat(70));
  lines.push("");

  return lines.join("\n");
}

/**
 * Create a compact error summary for inline logging
 *
 * @param {unknown} error - The error
 * @returns {string} Compact error summary
 */
function formatCompactError(error) {
  const details = extractTestErrorDetails(error);
  return `[${details.code}] ${details.message} (HTTP ${details.status})`;
}

/**
 * Check if error indicates a conflict (duplicate resource)
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is a conflict/duplicate error
 */
function isConflictError(error) {
  const details = extractTestErrorDetails(error);
  return details.code === "CONFLICT" || details.status === 409;
}

/**
 * Check if error indicates resource not found
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is a not found error
 */
function isNotFoundError(error) {
  const details = extractTestErrorDetails(error);
  return details.code === "NOT_FOUND" || details.status === 404;
}

/**
 * Check if error indicates authentication failure
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is an auth error
 */
function isAuthError(error) {
  const details = extractTestErrorDetails(error);
  return (
    details.code === "UNAUTHORIZED" ||
    details.code === "FORBIDDEN" ||
    details.status === 401 ||
    details.status === 403
  );
}

/**
 * Check if error indicates validation failure
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is a validation error
 */
function isValidationError(error) {
  const details = extractTestErrorDetails(error);
  return (
    details.code === "VALIDATION_ERROR" ||
    details.code === "BAD_REQUEST" ||
    details.status === 400
  );
}

/**
 * Check if error is a network error (connection issues, timeouts)
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is network-related
 */
function isNetworkError(error) {
  if (!error) return false;

  const details = extractTestErrorDetails(error);
  const message = (details.message || "").toLowerCase();
  const code = (details.code || "").toUpperCase();

  // Check for network error codes
  if (
    code === "NETWORK_ERROR" ||
    code === "TIMEOUT" ||
    code === "SERVICE_UNAVAILABLE"
  ) {
    return true;
  }

  // Check for network error patterns in message
  const networkPatterns = [
    /econnrefused/i,
    /econnreset/i,
    /enotfound/i,
    /timeout/i,
    /network/i,
    /connection.*refused/i,
    /connection.*reset/i,
    /dns.*resolution/i,
    /getaddrinfo/i,
  ];

  if (networkPatterns.some((pattern) => pattern.test(message))) {
    return true;
  }

  // Check error object properties
  if (error && typeof error === "object") {
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT"
    ) {
      return true;
    }
    if (error.isNetworkError === true) {
      return true;
    }
  }

  return false;
}

/**
 * Check if error originates from SDK (method not available, SDK internal errors)
 *
 * NOTE: Since SDK 0.5.9, all SDK path/endpoint issues are fixed.
 * Only method/implementation errors are SDK issues now.
 * HTTP 404/500 errors from SDK are server-side routing/implementation issues.
 *
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is from SDK (method/implementation only)
 */
function isSDKError(error) {
  if (!error) return false;

  const details = extractTestErrorDetails(error);
  const status = details.status;
  const message = (error.message || String(error)).toLowerCase();

  // CRITICAL: 404 errors are NEVER SDK errors - they indicate missing endpoints
  // HTTP errors (404, 500, etc.) are ALWAYS server-side issues
  if (status === 404 || status === 500 || status >= 400) {
    return false;
  }

  // CRITICAL: Only classify as SDK error if it's a METHOD/IMPLEMENTATION error
  // NOT HTTP errors, NOT server errors, NOT endpoint errors
  const sdkMethodPatterns = [
    /method not available/i,
    /is not a function/i,
    /cannot read property.*of undefined/i,
    /authservice.*refreshToken.*is not a function/i,
    /activity.*cleanup.*method not available/i,
  ];

  // Must match SDK method pattern AND not be an HTTP error
  const isMethodError = sdkMethodPatterns.some((pattern) =>
    pattern.test(message)
  );
  if (isMethodError && !status) {
    // Only if it's a method error AND no HTTP status (not an HTTP error)
    return true;
  }

  // Check stack trace for SDK package - but ONLY for method/implementation errors
  // NOT for HTTP errors (those are server-side)
  if (error.stack && !status) {
    const stack = error.stack.toLowerCase();
    const isSDKStack =
      stack.includes("@smartsamurai/krapi-sdk") || stack.includes("krapi-sdk");

    // Only classify as SDK error if it's a method/function error AND no HTTP status
    if (
      isSDKStack &&
      (message.includes("is not a function") ||
        message.includes("method not available") ||
        message.includes("cannot read property"))
    ) {
      return true;
    }
  }

  // Check if it's a KrapiError instance - but only if it's NOT an HTTP error
  if (error && typeof error === "object" && !status) {
    if (
      error.constructor &&
      error.constructor.name &&
      (error.constructor.name.includes("KrapiError") ||
        error.constructor.name.includes("Krapi"))
    ) {
      // Only if it's a method/implementation error, not HTTP
      if (
        message.includes("is not a function") ||
        message.includes("method not available")
      ) {
        return true;
      }
    }
    if (error.toJSON && typeof error.toJSON === "function") {
      // Likely SDK error class - but only if method error
      try {
        const json = error.toJSON();
        if (
          json.code &&
          typeof json.code === "string" &&
          json.code.startsWith("KRAPI_")
        ) {
          // Only if it's a method error, not HTTP
          if (
            message.includes("is not a function") ||
            message.includes("method not available")
          ) {
            return true;
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return false;
}

/**
 * Check if error originates from server (404 endpoint missing, 500 server errors, wrong response format)
 * @param {unknown} error - Any error type
 * @returns {boolean} True if error is from server
 */
function isServerError(error) {
  if (!error) return false;

  const details = extractTestErrorDetails(error);
  const status = details.status;
  const message = (details.message || "").toLowerCase();

  // If error is from SDK (method not available, SDK internal), it's NOT a server error
  if (isSDKError(error)) {
    return false;
  }

  // HTTP 404 (endpoint not found) is ALWAYS a server error
  // Since SDK 0.5.9 fixed all SDK path issues, 404s mean our endpoint doesn't exist or is misrouted
  if (status === 404) {
    return true;
  }

  // HTTP 500+ (server errors)
  if (status >= 500) {
    return true;
  }

  // Check for server error patterns (but exclude SDK-specific patterns)
  const serverPatterns = [
    /missing.*field/i,
    /empty.*response/i,
    /invalid.*response.*format/i,
    /wrong.*response/i,
    /backend.*error/i,
    /server.*error/i,
    /failed to.*fetch/i,
    /failed to.*get/i,
    /failed to.*create/i,
    /failed to.*update/i,
    /failed to.*delete/i,
  ];

  // Only match server patterns if NOT an SDK error
  if (serverPatterns.some((pattern) => pattern.test(message))) {
    return true;
  }

  // Check if error comes from backend route handler
  if (error && typeof error === "object" && error.response) {
    const responseData = error.response.data;
    if (responseData && typeof responseData === "object") {
      // Check for backend-specific error indicators
      if (responseData.requestedPath || responseData.method) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Classify error source: 'SDK', 'SERVER', 'NETWORK', or 'UNKNOWN'
 * @param {unknown} error - Any error type
 * @returns {string} Error source classification
 */
function classifyErrorSource(error) {
  if (!error) return "UNKNOWN";

  // Check in order: Network -> SDK -> Server
  if (isNetworkError(error)) {
    return "NETWORK";
  }

  if (isSDKError(error)) {
    return "SDK";
  }

  if (isServerError(error)) {
    return "SERVER";
  }

  return "UNKNOWN";
}

/**
 * Determine error category for better classification
 * @param {unknown} error - Any error type
 * @returns {string} Error category
 */
function getErrorCategory(error) {
  if (!error) return "UNKNOWN";

  const details = extractTestErrorDetails(error);
  const message = (details.message || "").toLowerCase();
  const status = details.status;

  // Missing endpoint
  if (
    status === 404 ||
    /endpoint.*not.*found|route.*not.*found|cannot.*post|get|put|delete/i.test(
      message
    )
  ) {
    return "MISSING_ENDPOINT";
  }

  // Missing method
  if (/method not available|is not a function/i.test(message)) {
    return "MISSING_METHOD";
  }

  // Invalid response
  if (
    /invalid.*response|wrong.*response|missing.*field|empty.*response/i.test(
      message
    )
  ) {
    return "INVALID_RESPONSE";
  }

  // Empty response
  if (/empty|no data|response.*keys.*empty/i.test(message)) {
    return "EMPTY_RESPONSE";
  }

  // Timeout
  if (status === 504 || /timeout/i.test(message)) {
    return "TIMEOUT";
  }

  // Server error
  if (status >= 500) {
    return "SERVER_ERROR";
  }

  // Validation error
  if (status === 400 || /validation|invalid|required|missing/i.test(message)) {
    return "VALIDATION_ERROR";
  }

  // Auth error
  if (
    status === 401 ||
    status === 403 ||
    /unauthorized|forbidden/i.test(message)
  ) {
    return "AUTH_ERROR";
  }

  return "UNKNOWN";
}

/**
 * Determine where the fix should be applied
 * @param {unknown} error - Any error type
 * @returns {string} Fix location: 'SDK', 'BACKEND', 'FRONTEND', or 'TEST'
 */
function getFixLocation(error) {
  if (!error) return "UNKNOWN";

  const source = classifyErrorSource(error);
  const category = getErrorCategory(error);
  const details = extractTestErrorDetails(error);
  const message = (details.message || "").toLowerCase();
  const status = details.status;

  // CRITICAL: Only real SDK method/implementation errors -> SDK
  // HTTP errors (404, 500, etc.) are NEVER SDK errors
  if ((source === "SDK" || category === "MISSING_METHOD") && !status) {
    // Only if it's truly a method error AND not an HTTP error
    if (
      message.includes("is not a function") ||
      message.includes("method not available")
    ) {
      return "SDK";
    }
  }

  // 404 errors are ALWAYS server-side (SDK path issues fixed in 0.5.9)
  // Determine if it's frontend or backend route
  if (status === 404 || category === "MISSING_ENDPOINT") {
    const url = details.details?.url || "";
    if (url.includes("/api/krapi/k1")) {
      return "FRONTEND"; // Frontend route missing
    }
    return "BACKEND"; // Backend route missing
  }

  // Server errors -> BACKEND
  if (source === "SERVER" || category === "SERVER_ERROR" || status >= 500) {
    return "BACKEND";
  }

  // Network errors could be any layer, but usually backend/frontend
  if (source === "NETWORK") {
    return "BACKEND"; // Usually backend connection issues
  }

  // Invalid/empty responses could be backend or frontend
  if (category === "INVALID_RESPONSE" || category === "EMPTY_RESPONSE") {
    // Check if it's a response format issue (likely backend) or routing issue (likely frontend)
    const url = details.details?.url || "";
    if (url.includes("/api/krapi/k1")) {
      return "FRONTEND"; // Frontend route issue
    }
    return "BACKEND"; // Backend response format issue
  }

  return "UNKNOWN";
}

export {
  extractTestErrorDetails,
  formatTestErrorLog,
  formatCompactError,
  isConflictError,
  isNotFoundError,
  isAuthError,
  isValidationError,
  isNetworkError,
  isSDKError,
  isServerError,
  classifyErrorSource,
  getErrorCategory,
  getFixLocation,
  getErrorCodeFromMessage,
  getStatusFromErrorCode,
};
