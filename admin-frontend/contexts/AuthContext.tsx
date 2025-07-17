"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authAPI } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  socket: WebSocket | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    // Check for existing token on mount
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");

      if (storedToken) {
        setToken(storedToken);
        // Don't call verifyToken here - let the next useEffect handle it
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Verify token when it changes
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  // Open WebSocket when authenticated
  useEffect(() => {
    if (token) {
      // Build WS URL - use backend port for development
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const isDev = process.env.NODE_ENV !== "production";
      const wsUrl = isDev
        ? `${protocol}//localhost:3001/ws?token=${token}`
        : `${protocol}//${window.location.host}/ws?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log("WebSocket connected");
      ws.onmessage = (event) => {
        try {
          JSON.parse(event.data);
          // Handle WebSocket messages here
        } catch {
          // Handle non-JSON messages if needed
        }
      };
      ws.onerror = (err) => console.error("WebSocket error:", err);
      ws.onclose = () => {
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (token) {
            // Only reconnect if still authenticated
          }
        }, 5000);
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await authAPI.verify();

      if (response.success && response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await authAPI.login(username, password);
      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem("auth_token", response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    // Close WebSocket connection
    if (socket) {
      socket.close();
      setSocket(null);
    }

    // Clear auth state
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.verify();
      if (response.success && response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        socket,
        isLoading,
        login,
        logout,
        refreshUser,
        isAuthenticated,
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
