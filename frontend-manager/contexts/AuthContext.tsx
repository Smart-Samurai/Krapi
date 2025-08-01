"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { createDefaultKrapi, KrapiClient } from "@/lib/krapi";
import type { AdminUser } from "@krapi/sdk";
import config from "@/lib/config";

interface AuthContextType {
  user: Omit<AdminUser, 'password_hash'> | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  loginInProgress: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  krapiClient: KrapiClient;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<AdminUser, 'password_hash'> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Keep a ref to the krapi client
  const krapiClientRef = useRef<KrapiClient>();

  const isAuthenticated = !!token;

  // Create or update krapi client instance
  const getKrapiClient = useCallback((authToken?: string) => {
    // Remove /krapi/k1 from the baseURL since SDK appends it
    const baseURL = config.api.baseUrl.replace(/\/krapi\/k1\/?$/, '');
    
    if (!krapiClientRef.current) {
      krapiClientRef.current = new KrapiClient({
        baseUrl: baseURL,
        authToken: authToken || token || undefined,
      });
    } else {
      // Update the auth token on the existing client
      krapiClientRef.current.setSessionToken(authToken || token || '');
    }
    
    return krapiClientRef.current;
  }, [token]);

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

      if (storedToken) {
        setToken(storedToken);
        // Update the krapi client with the stored token
        getKrapiClient(storedToken);
      } else {
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

  const login = useCallback(async (email: string, password: string) => {
    setLoginInProgress(true);
    setIsLoading(true);

    try {
      const krapi = getKrapiClient();
      const response = await krapi.auth.adminLogin(email, password);

      if (response.success && response.data) {
        const { token: authToken, user: userData } = response.data;
        
        // Store token
        localStorage.setItem("auth_token", authToken);
        setToken(authToken);
        setUser(userData);
        
        // Update the krapi client with the new token
        getKrapiClient(authToken);

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
  }, [getKrapiClient]);

  const logout = useCallback(() => {
    const krapi = getKrapiClient(token || undefined);
    // Call logout endpoint
    krapi.auth.logout().catch(console.error);
    
    // Clear local state
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    
    // Clear the auth token from the client
    krapi.setAuthToken('');
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

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isHydrated,
    loginInProgress,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    krapiClient: getKrapiClient(),
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
