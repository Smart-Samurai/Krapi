/**
 * Centralized Application Configuration
 *
 * SINGLE SOURCE OF TRUTH for all configuration values in the frontend application.
 * All hardcoded URLs, ports, endpoints, and environment variables should be defined here.
 *
 * @module lib/config
 * @example
 * import { config } from '@/lib/config';
 * const backendUrl = config.backend.url;
 * const apiEndpoint = config.api.basePath;
 */

/**
 * Environment variable names used throughout the application
 */
export const ENV_VARS = {
  BACKEND_URL: "KRAPI_BACKEND_URL",
  FRONTEND_URL: "KRAPI_FRONTEND_URL",
  PUBLIC_URL: "NEXT_PUBLIC_KRAPI_URL",
  ADMIN_API_KEY: "ADMIN_API_KEY",
  KRAPI_ADMIN_API_KEY: "KRAPI_ADMIN_API_KEY",
  NODE_ENV: "NODE_ENV",
  PORT: "PORT",
  HOST: "HOST",
} as const;

/**
 * Default configuration values
 */
const DEFAULTS = {
  BACKEND_URL: "http://127.0.0.1:3470",
  FRONTEND_URL: "http://127.0.0.1:3498",
  BACKEND_PORT: 3470,
  FRONTEND_PORT: 3498,
  API_BASE_PATH: "/krapi/k1",
  ADMIN_API_KEY: "admin-api-key",
  SDK_RETRY_MAX: 3,
  SDK_RETRY_DELAY: 1000,
  SDK_TIMEOUT: 2000, // Reduced from 30s to 2s for fast operations
  TOKEN_VALIDATION_TIMEOUT: 5000,
} as const;

/**
 * SDK retry configuration
 * Used by all SDK clients (backend and frontend)
 * Updated for SDK 0.6.0: uses { attempts, delay } format
 */
export const SDK_RETRY_CONFIG = {
  attempts: DEFAULTS.SDK_RETRY_MAX,
  delay: DEFAULTS.SDK_RETRY_DELAY,
};

/**
 * Centralized Application Configuration
 *
 * All configuration values are read from environment variables with sensible defaults.
 * This ensures consistency across the entire application.
 */
export const config = {
  /**
   * Environment detection
   */
  isDevelopment: process.env[ENV_VARS.NODE_ENV] !== "production",
  isProduction: process.env[ENV_VARS.NODE_ENV] === "production",

  /**
   * Backend configuration
   */
  backend: {
    url: process.env[ENV_VARS.BACKEND_URL] || DEFAULTS.BACKEND_URL,
    port: DEFAULTS.BACKEND_PORT,
    apiPath: DEFAULTS.API_BASE_PATH,
    /**
     * Get full backend API URL
     * @param endpoint - Optional endpoint path (e.g., '/auth/login')
     * @returns Full backend API URL
     */
    getApiUrl: (endpoint = "") => {
      const baseUrl = process.env[ENV_VARS.BACKEND_URL] || DEFAULTS.BACKEND_URL;
      const apiPath = DEFAULTS.API_BASE_PATH;
      const fullPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      return `${baseUrl}${apiPath}${fullPath}`;
    },
  },

  /**
   * Frontend configuration
   */
  frontend: {
    url:
      process.env[ENV_VARS.FRONTEND_URL] ||
      process.env[ENV_VARS.PUBLIC_URL] ||
      DEFAULTS.FRONTEND_URL,
    port: DEFAULTS.FRONTEND_PORT,
    /**
     * Get frontend API URL
     * @param endpoint - Optional endpoint path (e.g., '/api/krapi/k1/auth/login')
     * @returns Full frontend API URL
     */
    getApiUrl: (endpoint = "") => {
      const baseUrl =
        process.env[ENV_VARS.FRONTEND_URL] ||
        process.env[ENV_VARS.PUBLIC_URL] ||
        DEFAULTS.FRONTEND_URL;
      const fullPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      return `${baseUrl}${fullPath}`;
    },
  },

  /**
   * API configuration
   */
  api: {
    basePath: DEFAULTS.API_BASE_PATH,
    timeout: DEFAULTS.SDK_TIMEOUT,
    /**
     * Get API URL (legacy method for backward compatibility)
     * @param endpoint - Endpoint path
     * @returns Full API URL
     */
    getApiUrl: (endpoint = "") => {
      const baseUrl = process.env[ENV_VARS.BACKEND_URL] || DEFAULTS.BACKEND_URL;
      const apiPath = DEFAULTS.API_BASE_PATH;
      return endpoint
        ? `${baseUrl}${apiPath}${
            endpoint.startsWith("/") ? "" : "/"
          }${endpoint}`
        : `${baseUrl}${apiPath}`;
    },
  },

  /**
   * SDK configuration
   */
  sdk: {
    retry: SDK_RETRY_CONFIG,
    adminApiKey:
      process.env[ENV_VARS.ADMIN_API_KEY] ||
      process.env[ENV_VARS.KRAPI_ADMIN_API_KEY] ||
      DEFAULTS.ADMIN_API_KEY,
  },

  /**
   * Authentication configuration
   */
  auth: {
    tokenValidationTimeout: DEFAULTS.TOKEN_VALIDATION_TIMEOUT,
  },

  /**
   * Port configuration
   */
  ports: {
    backend: DEFAULTS.BACKEND_PORT,
    frontend: DEFAULTS.FRONTEND_PORT,
    current: process.env[ENV_VARS.PORT] || DEFAULTS.FRONTEND_PORT.toString(),
  },
} as const;

/**
 * Type-safe configuration export
 */
export type AppConfig = typeof config;

export default config;
