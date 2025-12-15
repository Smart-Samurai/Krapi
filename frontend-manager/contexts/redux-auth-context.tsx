/**
 * Redux Auth Context
 * 
 * Provides authentication context using Redux for state management.
 * Handles login, logout, session management, and scope checking.
 * 
 * @module contexts/redux-auth-context
 * @example
 * const { user, login, logout, hasScope } = useReduxAuth();
 */
"use client";

import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { AdminUser } from "@/lib/krapi";
import {
  clearAuthData,
  initializeAuth,
  login as loginAction,
  loginWithApiKey as loginWithApiKeyAction,
  logout as logoutAction,
} from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Auth Context Type
 * 
 * @interface AuthContextType
 * @property {AdminUser & { scopes?: string[] } | null} user - Current authenticated user
 * @property {boolean} loading - Whether auth is loading
 * @property {string | null} error - Error message if any
 * @property {Function} login - Login function
 * @property {Function} loginWithApiKey - Login with API key function
 * @property {Function} logout - Logout function
 * @property {typeof krapi} krapi - KRAPI SDK instance
 * @property {string | null} sessionToken - Current session token
 * @property {string | null} apiKey - Current API key
 * @property {string[]} scopes - User's current scopes
 * @property {Function} hasScope - Check if user has a scope
 * @property {Function} hasMasterAccess - Check if user has master access
 * @property {Function} handleAuthError - Handle authentication errors
 * @property {boolean} isInitialized - Whether auth is initialized
 */
interface AuthContextType {
  user: (AdminUser & { scopes?: string[] }) | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithApiKey: (apiKey: string) => Promise<void>;
  logout: () => Promise<void>;
  krapi: null; // SDK is not used in client components - always null (kept for backward compatibility)
  sessionToken: string | null;
  apiKey: string | null;
  scopes: string[];
  hasScope: (scope: string | string[]) => boolean;
  hasMasterAccess: () => boolean;
  handleAuthError: (error: unknown) => void;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Redux Auth Provider Component
 * 
 * Provides authentication context to the application using Redux for state management.
 * Initializes KRAPI SDK, handles authentication, and manages session tokens.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Auth provider with context
 * 
 * @example
 * <ReduxAuthProvider>
 *   <App />
 * </ReduxAuthProvider>
 */
export function ReduxAuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [sdkInitialized, setSdkInitialized] = useState(false);

  const { user, loading, error, sessionToken, apiKey, scopes, isInitialized } =
    useAppSelector((state) => state.auth);

  // SDK is no longer used in client - all operations go through API routes
  // Mark as initialized immediately
  useEffect(() => {
    if (!sdkInitialized) {
      setSdkInitialized(true);
    }
  }, [sdkInitialized]);

  // Initialize auth on mount (no SDK needed - uses API routes)
  useEffect(() => {
    if (!isInitialized && sdkInitialized) {
      // Initialize auth without SDK - it will use API routes
      dispatch(initializeAuth({}));
    }
  }, [dispatch, isInitialized, sdkInitialized]);

  // Handle auth errors and redirect
  const handleAuthError = useCallback(
    (error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Authentication error:", error);

      // Type guard for error objects
      const errorObj = error as {
        isAuthError?: boolean;
        status?: number;
        response?: { status?: number };
        message?: string;
        isApiError?: boolean;
      };

      // Check if it's an authentication error
      const isAuthError =
        errorObj?.isAuthError === true ||
        errorObj?.status === 401 ||
        errorObj?.response?.status === 401 ||
        (typeof errorObj?.message === "string" && (
          errorObj.message.includes("Unauthorized") ||
          errorObj.message.includes("Invalid token") ||
          errorObj.message.includes("Token expired") ||
          errorObj.message.includes("expired") ||
          errorObj.message.includes("Invalid") ||
          errorObj.message.includes("log in again")
        )) ||
        errorObj?.isApiError === true;

      if (isAuthError) {
        // Clear auth data
        dispatch(clearAuthData());

        // Only redirect if we're not already on the login page and not on the home page
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/") {
          const loginUrl = `/login?from=${encodeURIComponent(currentPath)}`;
          router.push(loginUrl);
        }
        return true; // Indicates that auth error was handled
      }

      return false; // Indicates that auth error was not handled
    },
    [dispatch, router]
  );

  // Global error handler for unhandled promise rejections (catches SDK errors)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorObj = error as {
        isAuthError?: boolean;
        status?: number;
        response?: { status?: number };
        message?: string;
      };
      if (error && (
        errorObj.isAuthError === true ||
        errorObj.status === 401 ||
        errorObj.response?.status === 401 ||
        (typeof errorObj.message === 'string' && (
          errorObj.message.includes('expired') ||
          errorObj.message.includes('Invalid') ||
          errorObj.message.includes('Unauthorized') ||
          errorObj.message.includes('log in again')
        ))
      )) {
        event.preventDefault(); // Prevent default error logging
        handleAuthError(error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleAuthError]);

  // Login function
  const login = useCallback(
    async (username: string, password: string) => {
      try {
        await dispatch(
          loginAction({ username, password })
        ).unwrap();

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } catch (error: unknown) {
        if (handleAuthError(error)) {
          return; // Error was handled, don't continue
        }
        throw error;
      }
    },
    [dispatch, handleAuthError]
  );

  // Login with API key function
  const loginWithApiKey = useCallback(
    async (apiKey: string) => {
      try {
        await dispatch(
          loginWithApiKeyAction({ apiKey })
        ).unwrap();

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } catch (error: unknown) {
        if (handleAuthError(error)) {
          return; // Error was handled, don't continue
        }
        throw error;
      }
    },
    [dispatch, handleAuthError]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAction({})).unwrap();
      router.push("/login");
    } catch (_error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", _error);
      // Don't throw error on logout failure, just clear local data
      dispatch(clearAuthData());
      router.push("/login");
    }
  }, [dispatch, router]);

  // Has scope function
  const hasScope = useCallback(
    (scope: string | string[]): boolean => {
      // Master scope has access to everything (case-insensitive check)
      const hasMasterScope = scopes.some((s) => s.toLowerCase() === "master");
      if (hasMasterScope) return true;

      if (Array.isArray(scope)) {
        // Check if user has any of the required scopes (case-insensitive)
        return scope.some((s) => 
          scopes.some((userScope) => userScope.toLowerCase() === s.toLowerCase())
        );
      }

      // Case-insensitive scope check
      return scopes.some((userScope) => userScope.toLowerCase() === scope.toLowerCase());
    },
    [scopes]
  );

  // Has master access function
  const hasMasterAccess = useCallback((): boolean => {
    return scopes.some((s) => s.toLowerCase() === "master");
  }, [scopes]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithApiKey,
        logout,
        krapi: null, // SDK no longer used in client - all operations via API routes
        sessionToken,
        apiKey,
        scopes,
        hasScope,
        hasMasterAccess,
        handleAuthError,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useReduxAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useReduxAuth must be used within a ReduxAuthProvider");
  }
  return context;
}