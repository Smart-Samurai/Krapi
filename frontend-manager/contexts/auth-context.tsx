"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KrapiSDK, AdminUser, createDefaultKrapi } from "@/lib/krapi";
import { toast } from "sonner";

interface AuthContextType {
  user: (AdminUser & { scopes?: string[] }) | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithApiKey: (apiKey: string) => Promise<void>;
  logout: () => Promise<void>;
  krapi: KrapiSDK | null;
  sessionToken: string | null;
  apiKey: string | null;
  scopes: string[];
  hasScope: (scope: string | string[]) => boolean;
  hasMasterAccess: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(AdminUser & { scopes?: string[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [krapi, setKrapi] = useState<KrapiSDK | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const router = useRouter();

  // Helper function to set cookie
  const setCookie = (name: string, value: string, days: number = 7) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  // Helper function to remove cookie
  const removeCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  };

  // Helper function to get cookie
  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Initialize client
  useEffect(() => {
    const storedToken =
      getCookie("session_token") || localStorage.getItem("session_token");
    const storedApiKey = localStorage.getItem("api_key");
          const client = createDefaultKrapi();
      
      if (storedToken) {
        client.setSessionToken(storedToken);
      } else if (storedApiKey) {
        client.setApiKey(storedApiKey);
      }

    setKrapi(client);

    if (storedToken) {
      setSessionToken(storedToken);
      validateSession(client, storedToken);
    } else if (storedApiKey) {
      setApiKey(storedApiKey);
      validateApiKey(client, storedApiKey);
    } else {
      setLoading(false);
      // If we're not on the login page and not authenticated, redirect
      if (window.location.pathname !== "/login") {
        router.push("/login");
      }
    }
  }, []);

  const validateSession = async (client: KrapiSDK, token: string) => {
    try {
      const response = await client.auth.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
        // Get scopes from stored session data
        const storedScopes = localStorage.getItem("user_scopes");
        if (storedScopes) {
          const parsedScopes = JSON.parse(storedScopes);
          setScopes(parsedScopes);
          setUser((prev: any) => (prev ? { ...prev, scopes: parsedScopes } : null));
        }
      } else {
        localStorage.removeItem("session_token");
        localStorage.removeItem("user_scopes");
        setSessionToken(null);
      }
    } catch (error) {
      console.error("Session validation failed:", error);
      localStorage.removeItem("session_token");
      localStorage.removeItem("user_scopes");
      setSessionToken(null);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (client: KrapiSDK, key: string) => {
    try {
      // Try to login with API key to get user info and scopes
      const response = await client.auth.adminApiLogin(key);
      if (response.success && response.data) {
        setUser(response.data.user);
        setScopes(response.data.user.scopes || []);
        setSessionToken(response.data.session_token);

        // Store in both localStorage and cookies
        localStorage.setItem("session_token", response.data.session_token);
        setCookie("session_token", response.data.session_token);
        localStorage.setItem(
          "user_scopes",
          JSON.stringify(response.data.user.scopes || [])
        );
        client.setSessionToken(response.data.session_token);
      } else {
        localStorage.removeItem("api_key");
        setApiKey(null);
      }
    } catch (error) {
      console.error("API key validation failed:", error);
      localStorage.removeItem("api_key");
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    if (!krapi) throw new Error("Client not initialized");

    try {
      const response = await krapi.auth.adminLogin({ username, password });

      if (response.success && response.data) {
        setUser(response.data.user);
        setScopes(response.data.user.scopes || []);
        setSessionToken(response.data.session_token);

        // Store in both localStorage and cookies
        localStorage.setItem("session_token", response.data.session_token);
        setCookie("session_token", response.data.session_token);
        localStorage.setItem(
          "user_scopes",
          JSON.stringify(response.data.user.scopes || [])
        );

        krapi.setSessionToken(response.data.session_token);
        toast.success("Login successful");

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } else {
        throw new Error("Login failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Invalid credentials");
      throw error;
    }
  };

  const loginWithApiKey = async (apiKey: string) => {
    if (!krapi) throw new Error("Client not initialized");

    try {
      const response = await krapi.auth.adminApiLogin(apiKey);

      if (response.success && response.data) {
        setUser(response.data.user);
        setScopes(response.data.user.scopes || []);
        setSessionToken(response.data.session_token);
        setApiKey(apiKey);

        // Store in both localStorage and cookies
        localStorage.setItem("session_token", response.data.session_token);
        setCookie("session_token", response.data.session_token);
        localStorage.setItem("api_key", apiKey);
        localStorage.setItem(
          "user_scopes",
          JSON.stringify(response.data.user.scopes || [])
        );

        krapi.setSessionToken(response.data.session_token);
        toast.success("API key login successful");

        // Check if there's a redirect URL
        const urlParams = new URLSearchParams(window.location.search);
        const from = urlParams.get("from") || "/dashboard";
        window.location.href = from;
      } else {
        throw new Error("API key login failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Invalid API key");
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (krapi && sessionToken) {
        await krapi.auth.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setScopes([]);
      setSessionToken(null);
      setApiKey(null);

      // Clear from both localStorage and cookies
      localStorage.removeItem("session_token");
      removeCookie("session_token");
      localStorage.removeItem("api_key");
      localStorage.removeItem("user_scopes");

      if (krapi) {
        krapi.clearAuth();
      }
      router.push("/login");
    }
  };

  const hasScope = (scope: string | string[]): boolean => {
    // Master scope has access to everything
    if (scopes.includes("master")) return true;

    if (Array.isArray(scope)) {
      // Check if user has any of the required scopes
      return scope.some((s) => scopes.includes(s));
    }

    return scopes.includes(scope);
  };

  const hasMasterAccess = (): boolean => {
    return scopes.includes("master");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithApiKey,
        logout,
        krapi,
        sessionToken,
        apiKey,
        scopes,
        hasScope,
        hasMasterAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
