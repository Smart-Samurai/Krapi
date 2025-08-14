// Base configuration
const baseConfig = {
  // API Configuration
  api: {
    baseUrl:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/krapi/k1",
    timeout: 30000,
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
          baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/krapi/k1",
        },
      }
    : {};

// Centralized configuration for API connections
export const config = {
  ...baseConfig,
  ...productionOverrides,

  // Helper functions
  getApiUrl: (endpoint = "") => {
    const baseUrl = baseConfig.api.baseUrl;
    return endpoint
      ? `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
      : baseUrl;
  },
};

export default config;
