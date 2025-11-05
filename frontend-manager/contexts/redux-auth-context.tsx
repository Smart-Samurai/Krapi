"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  initializeAuth,
  login as loginAction,
  loginWithApiKey as loginWithApiKeyAction,
  logout as logoutAction,
  clearAuthData,
} from "@/store/authSlice";
import type { AdminUser } from "@/lib/krapi";
import { krapi } from "@/lib/krapi";

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
  handleAuthError: (error: any) => void;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          const endpoint = process.env.NEXT_PUBLIC_API_URL?.replace('/krapi/k1', '') || 'http://localhost:3470';
          await krapi.connect({
            endpoint: endpoint,
          });
          console.log("✅ KRAPI SDK initialized in client mode");
          setSdkInitialized(true);
        } catch (error) {
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
    (error: any) => {
      console.error("Authentication error:", error);

      // Check if it's an authentication error
      const isAuthError =
        error?.status === 401 ||
        error?.response?.status === 401 ||
        error?.message?.includes("Unauthorized") ||
        error?.message?.includes("Invalid token") ||
        error?.message?.includes("Token expired") ||
        error?.isApiError === true;

      if (isAuthError) {
        // Clear auth data
        dispatch(clearAuthData());

        // Only redirect if we're not already on the login page and not on the home page
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/") {
          const loginUrl = `/login?from=${encodeURIComponent(currentPath)}`;
          router.push(loginUrl as any);
        }
        return true; // Indicates that auth error was handled
      }

      return false; // Indicates that auth error was not handled
    },
    [dispatch, router]
  );

  // Login function
  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await dispatch(
          loginAction({ username, password, krapi })
        ).unwrap();

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } catch (error: any) {
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
        const result = await dispatch(
          loginWithApiKeyAction({ apiKey, krapi })
        ).unwrap();

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } catch (error: any) {
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
    } catch (error) {
      console.error("Logout error:", error);
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
        krapi: krapi,
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