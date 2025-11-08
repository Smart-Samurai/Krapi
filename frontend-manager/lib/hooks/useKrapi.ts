/**
 * KRAPI Hook
 * 
 * Enhanced hook for using KRAPI SDK with automatic authentication error handling.
 * Wraps the SDK and automatically handles authentication errors by redirecting to login.
 * 
 * @module lib/hooks/useKrapi
 * @example
 * const krapi = useKrapi();
 * if (krapi) {
 *   const projects = await krapi.withAuthErrorHandling(() => krapi.projects.list());
 * }
 */
"use client";

import { useCallback, useMemo } from "react";

import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Use Krapi Hook
 * 
 * Enhanced hook for using KRAPI SDK with automatic authentication error handling.
 * 
 * @returns {Object | null} KRAPI SDK instance with withAuthErrorHandling helper, or null if not initialized
 * @returns {Function} returns.withAuthErrorHandling - Helper function to wrap API calls with auth error handling
 * 
 * @example
 * const krapi = useKrapi();
 * if (krapi) {
 *   const projects = await krapi.withAuthErrorHandling(() => krapi.projects.list());
 * }
 */
export function useKrapi() {
  const { krapi, handleAuthError } = useReduxAuth();

  /**
   * Wrapper function that handles auth errors automatically
   * 
   * Wraps API calls and automatically redirects to login on authentication errors.
   * 
   * @template T
   * @param {Function} apiCall - API call function
   * @returns {Promise<T>} API call result
   * @throws {Error} If KRAPI client not initialized
   */
  const withAuthErrorHandling = useCallback(
    async <T>(apiCall: () => Promise<T>): Promise<T> => {
      if (!krapi) {
        throw new Error("KRAPI client not initialized");
      }

      try {
        return await apiCall();
      } catch (error: unknown) {
        // Check if it's an authentication error
        const isAuthError =
          (error &&
            typeof error === "object" &&
            "status" in error &&
            error.status === 401) ||
          (error &&
            typeof error === "object" &&
            "response" in error &&
            error.response &&
            typeof error.response === "object" &&
            "status" in error.response &&
            error.response.status === 401) ||
          (error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string" &&
            (error.message.includes("Unauthorized") ||
              error.message.includes("Invalid token") ||
              error.message.includes("Token expired"))) ||
          (error &&
            typeof error === "object" &&
            "isApiError" in error &&
            error.isApiError === true);

        if (isAuthError) {
          // Handle auth error (this will redirect to login)
          handleAuthError(error);
          throw error; // Re-throw so the calling code knows the request failed
        }

        // For non-auth errors, just re-throw
        throw error;
      }
    },
    [krapi, handleAuthError]
  );

  // Return the SDK with a helper method for error handling
  return useMemo(() => {
    if (!krapi) {
      return null;
    }

    return {
      ...krapi,
      // Add a helper method for wrapping API calls with error handling
      withAuthErrorHandling,
    };
  }, [krapi, withAuthErrorHandling]);
}
