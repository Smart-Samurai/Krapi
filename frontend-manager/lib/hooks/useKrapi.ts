"use client";

import { useReduxAuth } from "@/contexts/redux-auth-context";
import { useCallback, useMemo } from "react";

/**
 * Enhanced hook for using KRAPI SDK with automatic authentication error handling
 * This hook wraps the SDK and automatically handles authentication errors by
 * redirecting to the login page when tokens expire or become invalid
 */
export function useKrapi() {
  const { krapi, handleAuthError } = useReduxAuth();

  // Wrapper function that handles auth errors automatically
  const withAuthErrorHandling = useCallback(
    async <T>(apiCall: () => Promise<T>): Promise<T> => {
      if (!krapi) {
        throw new Error("KRAPI client not initialized");
      }

      try {
        return await apiCall();
      } catch (error: any) {
        // Check if it's an authentication error
        const isAuthError =
          error?.status === 401 ||
          error?.response?.status === 401 ||
          error?.message?.includes("Unauthorized") ||
          error?.message?.includes("Invalid token") ||
          error?.message?.includes("Token expired") ||
          error?.isApiError === true;

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
