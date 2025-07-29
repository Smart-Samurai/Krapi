// Base configuration
const baseConfig = {
  // API Configuration
  api: {
    baseUrl:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/krapi/k1",
    timeout: 30000,
  },

  // WebSocket Configuration
  websocket: {
          url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws",
    heartbeatInterval: 300000,
    reconnectDelay: {
      initial: 1000, // 1 second
      max: 15000, // Reduced from 30 seconds to 15 seconds
      multiplier: 2, // Exponential backoff
    },
    maxReconnectAttempts: 3, // Reduced from 5 to 3 attempts
  },

  // Environment
  isDevelopment: process.env.NODE_ENV !== "production",
};

// Production overrides
const productionOverrides =
  process.env.NODE_ENV === "production"
    ? {
        api: {
          ...baseConfig.api,
          baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
        },
        websocket: {
          ...baseConfig.websocket,
          url: process.env.NEXT_PUBLIC_WS_URL || "/ws",
        },
      }
    : {};

// Centralized configuration for API and WebSocket connections
export const config = {
  ...baseConfig,
  ...productionOverrides,

  // Helper functions
  getApiUrl: (endpoint: string = "") => {
    const baseUrl = baseConfig.api.baseUrl;
    return endpoint
      ? `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
      : baseUrl;
  },

  getWebSocketUrl: (token?: string) => {
    const protocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    let wsUrl = baseConfig.websocket.url;

    // Handle protocol mismatch
    if (wsUrl.startsWith("ws:") && protocol === "wss:") {
      wsUrl = wsUrl.replace("ws:", "wss:");
    } else if (wsUrl.startsWith("wss:") && protocol === "ws:") {
      wsUrl = wsUrl.replace("wss:", "ws:");
    }

    // Add token if provided
    if (token) {
      const separator = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${separator}token=${token}`;
    }

    return wsUrl;
  },
};

export default config;
