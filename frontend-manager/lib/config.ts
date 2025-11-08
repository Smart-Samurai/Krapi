/**
 * Application Configuration
 * 
 * Centralized configuration for API connections and environment settings.
 * 
 * @module lib/config
 * @example
 * import { config } from '@/lib/config';
 * const apiUrl = config.getApiUrl('/projects');
 */
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

/**
 * Application Configuration Object
 * 
 * Centralized configuration for API connections and environment settings.
 * 
 * @constant {Object} config
 * @property {Object} config.api - API configuration
 * @property {string} config.api.baseUrl - Base API URL
 * @property {number} config.api.timeout - Request timeout in milliseconds
 * @property {boolean} config.isDevelopment - Whether running in development mode
 * @property {Function} config.getApiUrl - Helper to build API URLs
 * 
 * @example
 * const apiUrl = config.getApiUrl('/projects');
 * // Returns: 'http://localhost:3470/krapi/k1/projects'
 */
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
