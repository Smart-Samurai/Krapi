/**
 * Backend SDK Client for Frontend Routes
 *
 * CRITICAL: This service provides SDK access to backend from frontend routes.
 * All frontend-to-backend communication MUST use this service - NO direct fetch calls allowed.
 *
 * SDK 0.3.5+: Singleton properly clears HTTP clients on reconnection.
 * URL path conversion fixed - backend URLs with /krapi/k1 path are now preserved correctly.
 */

import { krapi } from "@smartsamurai/krapi-sdk";

import { config, SDK_RETRY_CONFIG } from "@/lib/config";

/**
 * Get backend SDK client instance (with API key)
 * Connects to backend URL (not frontend) to avoid circular dependencies
 * Used for operations that require admin API key (like login)
 *
 * SDK 0.3.5+: URL path conversion fixed - backend URLs with /krapi/k1 are preserved correctly
 *
 * @returns {Promise<typeof krapi>} SDK instance connected to backend with API key
 */
export async function getBackendSdkClient(): Promise<typeof krapi> {
  const backendUrl = config.backend.url;

  // SDK 0.3.5+: URL path conversion fixed - backend URLs with /krapi/k1 are preserved correctly
  // Pass full URL with /krapi/k1 path - SDK will respect it (Bug #2 fixed)
  const backendUrlWithPath = `${backendUrl}/krapi/k1`;

  await krapi.connect({
    endpoint: backendUrlWithPath,
    apiKey: config.sdk.adminApiKey,
    retry: SDK_RETRY_CONFIG,
    // Initialize HTTP clients immediately so setSessionToken() works
    initializeClients: true,
  });

  return krapi;
}

/**
 * Create authenticated backend SDK client with session token
 *
 * SDK 0.3.5+: Singleton properly clears HTTP clients on reconnection.
 * Note: For concurrent requests, session tokens may still overwrite each other on the singleton.
 * Consider using createInstance() when available for true isolation.
 *
 * @param {string} sessionToken - Session token for authentication
 * @returns {Promise<typeof krapi>} Authenticated SDK instance
 */
export async function createAuthenticatedBackendSdk(
  sessionToken: string
): Promise<typeof krapi> {
  const backendUrl = config.backend.url;
  const backendUrlWithPath = `${backendUrl}/krapi/k1`;

  // Connect with session token directly - this initializes the HTTP client with auth
  await krapi.connect({
    endpoint: backendUrlWithPath,
    sessionToken, // Pass session token directly to connect()
    retry: SDK_RETRY_CONFIG,
    initializeClients: true,
  });

  return krapi;
}
