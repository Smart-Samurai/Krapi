"use client";

/**
 * Authentication Context Provider
 * 
 * Manages authentication state and provides auth-related functionality throughout the app.
 * Handles login/logout, token persistence, and automatic token validation.
 * 
 * Features:
 * - Automatic token validation on mount
 * - Token persistence in localStorage
 * - Automatic SDK client configuration with auth token
 * - User state management
 * - Loading and hydration states
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { createDefaultKrapi, KrapiClient } from "@/lib/krapi";
import type { AdminUser } from "@krapi/sdk";
import config from "@/lib/config";

/**
 * Authentication context type definition
 */
interface AuthContextType {
  /** Current authenticated user (without password_hash) */
  user: Omit<AdminUser, "password_hash"> | null;
  /** Current authentication token */
  token: string | null;
  /** Whether authentication state is being loaded */
  isLoading: boolean;
  /** Whether the context has been hydrated from localStorage */
  isHydrated: boolean;
  /** Whether a login operation is in progress */
  loginInProgress: boolean;
  /** Login function - returns true on success */
  login: (email: string, password: string) => Promise<boolean>;
  /** Login with API key function */
  loginWithApiKey: (apiKey: string) => Promise<boolean>;
  /** Logout function - clears auth state */
  logout: () => void;
  /** Refresh current user data from API */
  refreshUser: () => Promise<void>;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Configured Krapi SDK client instance */
  krapiClient: KrapiClient;
  /** Legacy property for backward compatibility */
  krapi: KrapiClient;
  /** User scopes for access control */
  scopes: string[];
  /** Check if user has specific scope(s) */
  hasScope: (scope: string | string[]) => boolean;
  /** Check if user has master access */
  hasMasterAccess: () => boolean;
  /** Legacy property for backward compatibility */
  loading: boolean;
  /** Session token for API requests */
  sessionToken: string | null;
  /** API key for authentication */
  apiKey: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/**
 * Authentication Provider Component
 * 
 * Wrap your app with this provider to enable authentication functionality.
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<AdminUser, "password_hash"> | null>(
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [scopes, setScopes] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const router = useRouter();

  // Keep a ref to the krapi client
  const krapiClientRef = useRef<KrapiClient | null>(null);

  const isAuthenticated = !!token;

  // Create or update krapi client instance
  const getKrapiClient = useCallback(
    (authToken?: string) => {
      const baseURL = config.api.baseUrl;

      if (!krapiClientRef.current) {
        krapiClientRef.current = new KrapiClient({
          baseUrl: baseURL,
          sessionToken: authToken || token || undefined,
        });
      } else {
        // Update the auth token on the existing client
        krapiClientRef.current.setSessionToken(authToken || token || "");
      }

      return krapiClientRef.current;
    },
    [token]
  );

  const verifyToken = useCallback(async () => {
    try {
      const krapi = getKrapiClient(token || undefined);
      const response = await krapi.auth.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [getKrapiClient, token]);

  useEffect(() => {
    // Check for existing token on mount
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");
      const storedScopes = localStorage.getItem("user_scopes");
      const storedApiKey = localStorage.getItem("api_key");

      if (storedToken) {
        setToken(storedToken);
        // Update the krapi client with the stored token
        getKrapiClient(storedToken);
      }
      
      if (storedScopes) {
        try {
          const parsedScopes = JSON.parse(storedScopes);
          setScopes(parsedScopes);
        } catch (error) {
          console.error("Failed to parse stored scopes:", error);
        }
      }
      
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
      
      if (!storedToken) {
        setIsLoading(false);
        setIsHydrated(true);
      }
    } else {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [getKrapiClient]);

  // Verify token when it changes
  useEffect(() => {
    if (!token || loginInProgress) {
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    verifyToken();
  }, [token, loginInProgress, verifyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoginInProgress(true);
      setIsLoading(true);

      try {
        const krapi = getKrapiClient();
        const response = await krapi.auth.adminLogin({
          username: email,
          password,
        });

        if (response.success && response.data) {
          const { session_token: authToken, user: userData } = response.data;

          // Store token
          localStorage.setItem("auth_token", authToken);
          setToken(authToken);
          setUser(userData);
          
          // Set scopes from user data
          const userScopes = userData.scopes || [];
          setScopes(userScopes);
          localStorage.setItem("user_scopes", JSON.stringify(userScopes));

          // Update the krapi client with the new token
          getKrapiClient(authToken);

          // Redirect to dashboard
          router.push("/dashboard");

          return true;
        } else {
          throw new Error(response.error || "Login failed");
        }
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        setLoginInProgress(false);
        setIsLoading(false);
      }
    },
    [getKrapiClient]
  );

  const loginWithApiKey = useCallback(
    async (apiKey: string) => {
      setLoginInProgress(true);
      setIsLoading(true);

      try {
        const krapi = getKrapiClient();
        const response = await krapi.auth.adminApiLogin(apiKey);

        if (response.success && response.data) {
          const { session_token: authToken, user: userData } = response.data;

          // Store token and API key
          localStorage.setItem("auth_token", authToken);
          localStorage.setItem("api_key", apiKey);
          setToken(authToken);
          setUser(userData);
          
          // Set scopes from user data
          const userScopes = userData.scopes || [];
          setScopes(userScopes);
          localStorage.setItem("user_scopes", JSON.stringify(userScopes));

          // Update the krapi client with the new token
          getKrapiClient(authToken);

          // Redirect to dashboard
          router.push("/dashboard");

          return true;
        } else {
          throw new Error(response.error || "API key login failed");
        }
      } catch (error) {
        console.error("API key login error:", error);
        throw error;
      } finally {
        setLoginInProgress(false);
        setIsLoading(false);
      }
    },
    [getKrapiClient]
  );

  const logout = useCallback(() => {
    const krapi = getKrapiClient(token || undefined);
    // Call logout endpoint
    krapi.auth.logout().catch(console.error);

    // Clear local state
    localStorage.removeItem("auth_token");
    localStorage.removeItem("api_key");
    localStorage.removeItem("user_scopes");
    setToken(null);
    setUser(null);
    setScopes([]);

    // Clear the auth token from the client
    krapi.clearAuth();
  }, [getKrapiClient]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const krapi = getKrapiClient(token);
      const response = await krapi.auth.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [token, getKrapiClient]);

  const hasScope = useCallback((scope: string | string[]): boolean => {
    // Master scope has access to everything
    if (scopes.includes("MASTER")) return true;

    if (Array.isArray(scope)) {
      // Check if user has any of the required scopes
      return scope.some((s) => scopes.includes(s));
    }

    return scopes.includes(scope);
  }, [scopes]);

  const hasMasterAccess = useCallback((): boolean => {
    return scopes.includes("MASTER");
  }, [scopes]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isHydrated,
    loginInProgress,
    login,
    loginWithApiKey,
    logout,
    refreshUser,
    isAuthenticated,
    krapiClient: getKrapiClient(),
    krapi: getKrapiClient(), // Legacy property for backward compatibility
    scopes,
    hasScope,
    hasMasterAccess,
    loading: isLoading, // Legacy property for backward compatibility
    sessionToken: token, // Legacy property for backward compatibility
    apiKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
