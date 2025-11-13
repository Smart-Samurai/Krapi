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

import { krapi, type AdminUser } from "@/lib/krapi";
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
  krapi: typeof krapi;
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

  // Initialize SDK in client mode on mount
  useEffect(() => {
    if (!sdkInitialized) {
      const initSdk = async () => {
        try {
          // Frontend should connect to frontend URL (port 3498)
          // SDK will automatically append /api/krapi/k1 and validate the endpoint
          const endpoint = process.env.NEXT_PUBLIC_API_URL?.replace('/krapi/k1', '') || 'http://localhost:3498';
          const connectConfig: any = {
            endpoint,
            // Enable retry logic for better reliability (if SDK supports it)
            retry: {
              enabled: true,
              maxRetries: 3,
              retryDelay: 1000, // 1 second
              retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            },
          };
          await krapi.connect(connectConfig);
          
          // Perform health check after connection (if SDK supports it)
          try {
            if (typeof (krapi as any).healthCheck === 'function') {
              const isHealthy = await (krapi as any).healthCheck();
              if (!isHealthy) {
                // eslint-disable-next-line no-console
                console.warn("⚠️ SDK health check failed - connection may be unstable");
              } else {
                // eslint-disable-next-line no-console
                console.log("✅ KRAPI SDK initialized in client mode and healthy");
              }
            }
          } catch (healthError) {
            // eslint-disable-next-line no-console
            console.warn("⚠️ SDK health check error:", healthError);
          }
          
          setSdkInitialized(true);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("❌ Failed to initialize KRAPI SDK:", error);
          setSdkInitialized(true); // Set to true anyway to prevent infinite retries
        }
      };
      initSdk();
    }
  }, [sdkInitialized]);

  // Initialize auth on mount (after SDK is initialized)
  useEffect(() => {
    if (!isInitialized && sdkInitialized) {
      dispatch(initializeAuth({ krapi }));
    }
  }, [dispatch, isInitialized, sdkInitialized]);

  // Update krapi client when session token changes
  useEffect(() => {
    if (sessionToken && sdkInitialized) {
      krapi.auth.setSessionToken(sessionToken);
    } else if (apiKey && sdkInitialized) {
      krapi.auth.setApiKey(apiKey);
    }
  }, [sessionToken, apiKey, sdkInitialized]);

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
          loginAction({ username, password, krapi })
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
          loginWithApiKeyAction({ apiKey, krapi })
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
      await dispatch(logoutAction({ krapi })).unwrap();
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
      // Master scope has access to everything
      if (scopes.includes("master")) return true;

      if (Array.isArray(scope)) {
        // Check if user has any of the required scopes
        return scope.some((s) => scopes.includes(s));
      }

      return scopes.includes(scope);
    },
    [scopes]
  );

  // Has master access function
  const hasMasterAccess = useCallback((): boolean => {
    return scopes.includes("master");
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
        krapi,
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