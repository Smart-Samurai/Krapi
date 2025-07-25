"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const isAuthenticated = !!token; // Simplified: if we have a token, we're authenticated

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
    if (token) {
      verifyToken();
    }
  }, [token]);

  // Open WebSocket when authenticated
  useEffect(() => {
    if (token) {
      // Build WS URL using centralized config
      const wsUrl = config.getWebSocketUrl(token);

      console.log("Attempting WebSocket connection to:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setReconnectAttempts(0); // Reset reconnection counter

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
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", data);
          // Handle WebSocket messages here
        } catch {
          console.warn("Non-JSON WebSocket message:", event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        // Don't attempt to use the connection after an error
      };

      ws.onclose = (event) => {
        console.log(
          `🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`
        );

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
          console.log(
            `🔄 Attempting WebSocket reconnection #${
              reconnectAttempts + 1
            } in ${delay / 1000} seconds...`
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
        console.log("🔌 Closing WebSocket connection");

        // Clean up heartbeat interval
        if ((ws as any).heartbeatInterval) {
          clearInterval((ws as any).heartbeatInterval);
        }

        ws.close(1000, "Component unmounting");
      };
    } else {
      // Clear socket when not authenticated
      if (socket) {
        console.log("🔌 Closing WebSocket due to logout");
        socket.close(1000, "User logged out");
        setSocket(null);
      }
    }
  }, [token, reconnectAttempts]);

  const verifyToken = async () => {
    try {
      console.log("🔍 Verifying token...");
      const krapi = createDefaultKrapi();
      const response = await krapi.auth.verify();
      console.log("🔍 Token verification response:", response);

      if (response.success && response.data) {
        console.log("✅ Token verified, setting user:", response.data);
        setUser(response.data);
      } else {
        console.log("❌ Token verification failed, clearing token");
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
    } finally {
      console.log("🔍 Setting loading=false, hydrated=true");
      setIsLoading(false);
      setIsHydrated(true);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      console.log("🔐 AuthContext: Attempting login...");
      const krapi = createDefaultKrapi();
      const response = await krapi.auth.login(username, password);
      console.log("🔐 AuthContext: Login response:", response);

      if (response.success && response.token && response.user) {
        // Set both token and user immediately to avoid timing issues
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem("auth_token", response.token);
        console.log("✅ AuthContext: Login successful - token and user set");
        return true;
      }
      console.log("❌ AuthContext: Login failed - invalid response");
      return false;
    } catch (error) {
      console.error("❌ AuthContext: Login failed:", error);
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
