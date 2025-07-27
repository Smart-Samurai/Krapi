"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createDefaultKrapi } from "@/lib/krapi";
import { AuthUser } from "@/lib/krapi/types";
import { config } from "@/lib/config";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  socket: WebSocket | null;
  isLoading: boolean;
  isHydrated: boolean;
  loginInProgress: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const isAuthenticated = !!token; // Simplified: if we have a token, we're authenticated

  const verifyToken = useCallback(async () => {
    try {
      const krapi = createDefaultKrapi();
      const response = await krapi.auth.verify();

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    } catch (_error) {
      console.error("❌ Token verification failed:", _error);
      localStorage.removeItem("auth_token");
      setToken(null);
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
        // Don't call verifyToken here - let the next useEffect handle it
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
    // Don't verify token during login attempts or if no token
    if (!token || loginInProgress) {
      console.log(
        "🔐 Skipping token verification - no token or login in progress"
      );
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    console.log("🔐 Verifying token...");
    verifyToken();
  }, [token, loginInProgress, verifyToken]);

  // Open WebSocket when authenticated
  useEffect(() => {
    if (token) {
      // Build WS URL using centralized config
      const wsUrl = config.getWebSocketUrl(token);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send initial heartbeat
        const heartbeat = () => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "heartbeat" }));
            } catch {
              console.warn("Failed to send heartbeat");
            }
          }
        };

        // Send heartbeat using config interval
        const heartbeatInterval = setInterval(
          heartbeat,
          config.websocket.heartbeatInterval
        );

        // Store interval ID for cleanup
        (ws as any).heartbeatInterval = heartbeatInterval;
      };

      ws.onmessage = (event) => {
        try {
          const _data = JSON.parse(event.data);
          // Handle WebSocket messages here
        } catch {
          console.warn("Non-JSON WebSocket message:", event.data);
        }
      };

      ws.onerror = (_error) => {
        // Don't attempt to use the connection after an error
      };

      ws.onclose = (event) => {
        // Clean up heartbeat interval
        if ((ws as any).heartbeatInterval) {
          clearInterval((ws as any).heartbeatInterval);
        }

        // Only attempt reconnection if token is still valid and connection wasn't intentionally closed
        // Also check that we're still authenticated to prevent unnecessary reconnection attempts
        if (
          token &&
          user &&
          event.code !== 1000 &&
          reconnectAttempts < config.websocket.maxReconnectAttempts
        ) {
          const delay = Math.min(
            config.websocket.reconnectDelay.initial *
              Math.pow(
                config.websocket.reconnectDelay.multiplier,
                reconnectAttempts
              ),
            config.websocket.reconnectDelay.max
          );

          setTimeout(() => {
            if (token && user) {
              // Double-check we're still authenticated
              setReconnectAttempts((prev) => prev + 1);
              // Trigger re-effect by updating a state variable
              setSocket(null);
            }
          }, delay);
        } else if (reconnectAttempts >= config.websocket.maxReconnectAttempts) {
          console.error(
            "❌ Maximum reconnection attempts reached. WebSocket will not reconnect automatically."
          );
        }
      };

      setSocket(ws);

      return () => {
        // Clean up heartbeat interval
        if ((ws as any).heartbeatInterval) {
          clearInterval((ws as any).heartbeatInterval);
        }

        ws.close(1000, "Component unmounting");
      };
    } else {
      // Clear socket when not authenticated
      if (socket) {
        socket.close(1000, "User logged out");
        setSocket(null);
      }
    }
  }, [token, reconnectAttempts]);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setLoginInProgress(true);
    try {
      console.log("🔐 AuthContext: Attempting login...");
      const krapi = createDefaultKrapi();
      const response = await krapi.auth.login(username, password);
      console.log("🔐 AuthContext: Login response:", response);

      if (response.success && response.token && response.user) {
        console.log(
          "🔐 AuthContext: Login successful - setting token and user"
        );
        // Store in localStorage first
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("auth_user", JSON.stringify(response.user));

        // Then set state (this will trigger verifyToken)
        setToken(response.token);
        setUser(response.user);

        setLoginInProgress(false);
        return true;
      }
      console.log("🔐 AuthContext: Login failed - invalid response");
      // If login failed but no exception, throw the error message
      throw new Error(response.error || "Login failed");
    } catch (error) {
      console.log("🔐 AuthContext: Login error caught:", error);
      setLoginInProgress(false);
      // Re-throw the error so the login page can handle it
      throw error;
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
      const krapi = createDefaultKrapi();
      const response = await krapi.auth.verify();

      if (response.success && response.data) {
        setUser(response.data);
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

  // Don't render children until hydration is complete to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        socket,
        isLoading,
        isHydrated,
        loginInProgress,
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
