"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiClient } from "@/lib/api-client";
import { AdminUser } from "@/lib/krapi-sdk/types";

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

  const isAuthenticated = !!token;

  const verifyToken = useCallback(async () => {
    try {
      const response = await apiClient.auth.getCurrentUser();

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
  }, []);

  useEffect(() => {
    // Check for existing token on mount
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");

      if (storedToken) {
        setToken(storedToken);
      } else {
        setIsLoading(false);
        setIsHydrated(true);
      }
    } else {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, []);

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
      const response = await apiClient.auth.login(email, password);

      if (response.success && response.data) {
        const { token: authToken, user: userData } = response.data;
        
        // Store token
        localStorage.setItem("auth_token", authToken);
        setToken(authToken);
        setUser(userData);

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
  }, []);

  const logout = useCallback(() => {
    // Call logout endpoint
    apiClient.auth.logout().catch(console.error);
    
    // Clear local state
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiClient.auth.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [token]);

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
