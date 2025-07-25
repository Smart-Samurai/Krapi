import { useState, useEffect, useCallback } from "react";
import { createDefaultKrapi } from "@/lib/krapi";

interface ConnectionHealth {
  api: {
    status: "connected" | "disconnected" | "checking";
    lastCheck: Date | null;
    error: string | null;
  };
  websocket: {
    status: "connected" | "disconnected" | "connecting" | "reconnecting";
    lastConnected: Date | null;
    reconnectAttempts: number;
    error: string | null;
  };
  overall: "healthy" | "degraded" | "unhealthy";
}

export const useConnectionHealth = (socket: WebSocket | null) => {
  const [health, setHealth] = useState<ConnectionHealth>({
    api: {
      status: "checking",
      lastCheck: null,
      error: null,
    },
    websocket: {
      status: "disconnected",
      lastConnected: null,
      reconnectAttempts: 0,
      error: null,
    },
    overall: "unhealthy",
  });

  const checkApiHealth = useCallback(async () => {
    setHealth((prev) => ({
      ...prev,
      api: { ...prev.api, status: "checking" },
    }));

    try {
      await createDefaultKrapi().check();
      setHealth((prev) => ({
        ...prev,
        api: {
          status: "connected",
          lastCheck: new Date(),
          error: null,
        },
      }));
    } catch {
      setHealth((prev) => ({
        ...prev,
        api: {
          status: "disconnected",
          lastCheck: new Date(),
          error: "API connection failed",
        },
      }));
    }
  }, []);

  const updateWebSocketStatus = useCallback(
    (status: ConnectionHealth["websocket"]["status"], error?: string) => {
      setHealth((prev) => ({
        ...prev,
        websocket: {
          ...prev.websocket,
          status,
          lastConnected:
            status === "connected" ? new Date() : prev.websocket.lastConnected,
          reconnectAttempts:
            status === "connected" ? 0 : prev.websocket.reconnectAttempts,
          error:
            error || (status === "connected" ? null : prev.websocket.error),
        },
      }));
    },
    []
  );

  // Monitor WebSocket status
  useEffect(() => {
    if (!socket) {
      updateWebSocketStatus("disconnected");
      return;
    }

    const handleOpen = () => {
      updateWebSocketStatus("connected");
    };

    const handleClose = (event: CloseEvent) => {
      updateWebSocketStatus("disconnected", `Connection closed: ${event.code}`);
    };

    const handleError = (error: Event) => {
      updateWebSocketStatus("disconnected", "WebSocket error occurred");
    };

    // Set initial status based on current state
    if (socket.readyState === WebSocket.CONNECTING) {
      updateWebSocketStatus("connecting");
    } else if (socket.readyState === WebSocket.OPEN) {
      updateWebSocketStatus("connected");
    } else {
      updateWebSocketStatus("disconnected");
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
    };
  }, [socket, updateWebSocketStatus]);

  // Calculate overall health
  useEffect(() => {
    const { api, websocket } = health;

    let overall: ConnectionHealth["overall"];

    if (api.status === "connected" && websocket.status === "connected") {
      overall = "healthy";
    } else if (api.status === "connected" || websocket.status === "connected") {
      overall = "degraded";
    } else {
      overall = "unhealthy";
    }

    setHealth((prev) => ({ ...prev, overall }));
  }, [health.api.status, health.websocket.status]);

  // Periodic API health checks
  useEffect(() => {
    // Initial check
    checkApiHealth();

    // Set up periodic checks every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, [checkApiHealth]);

  const retryConnections = useCallback(async () => {
    checkApiHealth();
    // WebSocket reconnection is handled by AuthContext
  }, [checkApiHealth]);

  return {
    health,
    checkApiHealth,
    retryConnections,
    updateWebSocketStatus,
  };
};

export default useConnectionHealth;
