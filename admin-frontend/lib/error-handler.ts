/**
 * Comprehensive Error Handling System
 * Provides clear, single error messages with proper context and debugging information
 */

export interface ErrorContext {
  component: string;
  function: string;
  endpoint?: string;
  method?: string;
  operation?: string;
  resource?: string;
  action?: string;
  params?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  code?: string;
  context: ErrorContext;
  serverError?: string;
  suggestions: string[];
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle API errors with clear, single error messages
   */
  handleApiError(
    error: any,
    context: Omit<ErrorContext, "timestamp">
  ): ApiError {
    const errorContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
    };

    // Network/Connection errors
    if (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      return {
        message: "Cannot connect to the API server",
        code: error.code,
        context: errorContext,
        suggestions: [
          "Check if the backend server is running on port 3470",
          "Verify the API server is accessible at http://localhost:3470",
          "Check your network connection and firewall settings",
          "Restart the API server if it's not responding",
        ],
      };
    }

    // HTTP Status errors
    if (error.response?.status) {
      const status = error.response.status;
      const serverError =
        error.response.data?.error || error.response.data?.message;

      switch (status) {
        case 400:
          return {
            message: "Invalid request sent to the server",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "Check the request parameters and data format",
              "Verify all required fields are provided",
              "Ensure data types match expected format",
            ],
          };

        case 401:
          return {
            message: "Authentication required - please log in again",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "Your session may have expired",
              "Please log in again to continue",
              "Check if your authentication token is valid",
            ],
          };

        case 403:
          return {
            message: "Access denied - insufficient permissions",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "You don't have permission to perform this action",
              "Contact an administrator for access",
              "Check if your account has the required role",
            ],
          };

        case 404:
          return {
            message: "API endpoint not found",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "The requested API endpoint doesn't exist",
              "Check if the API route is correctly implemented",
              "Verify the API version and endpoint path",
              "Review the API documentation for correct endpoints",
            ],
          };

        case 422:
          return {
            message: "Invalid data provided",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "Check the data validation rules",
              "Ensure all required fields are provided",
              "Verify data format and types",
            ],
          };

        case 500:
          return {
            message: "Server encountered an internal error",
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "This is a server-side issue",
              "Check the server logs for detailed error information",
              "Contact the system administrator",
              "Try again later or restart the server",
            ],
          };

        default:
          return {
            message: `HTTP ${status} error occurred`,
            status,
            statusText: error.response.statusText,
            context: errorContext,
            serverError,
            suggestions: [
              "An unexpected error occurred",
              "Check the server logs for more details",
              "Contact support if the issue persists",
            ],
          };
      }
    }

    // Timeout errors
    if (error.code === "ECONNABORTED") {
      return {
        message: "Request timed out - server took too long to respond",
        code: error.code,
        context: errorContext,
        suggestions: [
          "The server is taking longer than expected to respond",
          "Check if the server is under heavy load",
          "Try again in a few moments",
          "Contact support if the issue persists",
        ],
      };
    }

    // Generic error
    return {
      message: error.message || "An unexpected error occurred",
      context: errorContext,
      suggestions: [
        "Check the browser console for more details",
        "Verify your internet connection",
        "Try refreshing the page",
        "Contact support if the issue persists",
      ],
    };
  }

  /**
   * Handle frontend-specific errors
   */
  handleFrontendError(
    error: Error,
    context: Omit<ErrorContext, "timestamp">
  ): ApiError {
    const errorContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
    };

    return {
      message: error.message,
      context: errorContext,
      suggestions: [
        "This is a frontend error",
        "Check the browser console for more details",
        "Try refreshing the page",
        "Clear browser cache and try again",
      ],
    };
  }

  /**
   * Log error with proper formatting
   */
  logError(apiError: ApiError): void {
    console.group(`🚨 ERROR: ${apiError.message}`);
    console.error("Context:", apiError.context);
    console.error("Status:", apiError.status);
    console.error("Server Error:", apiError.serverError);
    console.error("Suggestions:", apiError.suggestions);
    console.groupEnd();
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(apiError: ApiError): string {
    let message = apiError.message;

    if (apiError.serverError && apiError.serverError !== apiError.message) {
      message += `: ${apiError.serverError}`;
    }

    return message;
  }

  /**
   * Handle API call with proper error handling
   */
  async handleApiCall<T>(
    apiCall: () => Promise<T>,
    context: Omit<ErrorContext, "timestamp">
  ): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
    try {
      const data = await apiCall();
      return { success: true, data };
    } catch (error) {
      const apiError = this.handleApiError(error, context);
      this.logError(apiError);
      return { success: false, error: apiError };
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
