/**
 * Frontend SDK Client for API Routes
 *
 * CRITICAL: This service provides SDK access for frontend API routes.
 * All frontend-to-backend communication MUST use this service - NO direct fetch calls allowed.
 *
 * ARCHITECTURE: Two-layer system to avoid circular dependencies
 * 
 * 1. CLIENT ROUTES (/api/client/krapi/k1/...)
 *    - Called by frontend GUI
 *    - Use SDK to connect to FRONTEND URL (like 3rd party app)
 *    - Call proxy routes via SDK
 * 
 * 2. PROXY ROUTES (/api/krapi/k1/...)
 *    - Called by client routes (via SDK) or external apps
 *    - Connect to BACKEND URL directly
 *    - Proxy requests to backend server
 *
 * This matches exactly how the comprehensive test suite works:
 * - Test suite connects to frontend URL (port 3498) - like client routes
 * - Proxy routes connect to backend URL (port 3470) - direct backend access
 *
 * UPDATED: Now uses createSDKInstance() to create separate, isolated SDK instances
 * for client and proxy routes, eliminating connection conflicts.
 */

import { createSDKInstance, KrapiWrapper } from "@smartsamurai/krapi-sdk";

import { config, SDK_RETRY_CONFIG } from "@/lib/config";
import { ensureProxySigningInterceptor } from "@/lib/proxy-signing";

ensureProxySigningInterceptor();

// Separate SDK instances for client and proxy routes
// Each instance maintains its own connection state, eliminating conflicts
let clientSdkInstance: KrapiWrapper | null = null;
let clientConnectionPromise: Promise<void> | null = null;
let clientEndpoint: string | null = null;
let clientApiKey: string | null = null;
let clientSessionToken: string | null = null;

let proxySdkInstance: KrapiWrapper | null = null;
let proxyConnectionPromise: Promise<void> | null = null;
let proxyEndpoint: string | null = null;
let proxyApiKey: string | null = null;
let proxySessionToken: string | null = null;

/**
 * Get CLIENT SDK instance (connects to FRONTEND URL)
 * Used by CLIENT ROUTES (/api/client/krapi/k1/...)
 * These routes use SDK like a 3rd party app to call proxy routes
 *
 * @returns {Promise<KrapiWrapper>} SDK instance connected to frontend with API key
 */
export async function getClientSdkClient(): Promise<KrapiWrapper> {
  // CLIENT ROUTES: Connect to FRONTEND URL (like 3rd party app)
  const frontendUrl = config.frontend.url;
  const apiKey = config.sdk.adminApiKey;

  // If already connected to the same endpoint with the same API key, return cached instance
  if (clientSdkInstance && clientConnectionPromise && clientEndpoint === frontendUrl && clientApiKey === apiKey) {
    await clientConnectionPromise;
    return clientSdkInstance;
  }

  // Create new SDK instance for client routes
  if (!clientSdkInstance) {
    clientSdkInstance = createSDKInstance();
  }

  // Create new connection promise
  const timeout = 5000; // 5 second timeout
  clientConnectionPromise = Promise.race([
    clientSdkInstance.connect({
      endpoint: frontendUrl, // Frontend URL (port 3498) - same as comprehensive test suite
      apiKey,
      retry: SDK_RETRY_CONFIG,
      initializeClients: true,
      timeout,
    } as unknown as Parameters<typeof clientSdkInstance.connect>[0]),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Client SDK connection timeout")), timeout)
    ),
  ]).then(() => {
    clientEndpoint = frontendUrl;
    clientApiKey = apiKey;
    clientSessionToken = null; // Clear session token when using API key
  }).catch((error) => {
    clientConnectionPromise = null; // Reset on failure
    clientSdkInstance = null;
    throw error;
  });

  await clientConnectionPromise;
  return clientSdkInstance;
}

/**
 * Get PROXY SDK instance (connects to BACKEND URL)
 * Used by PROXY ROUTES (/api/krapi/k1/...)
 * These routes connect directly to backend server
 *
 * @returns {Promise<KrapiWrapper>} SDK instance connected to backend with API key
 */
export async function getBackendSdkClient(): Promise<KrapiWrapper> {
  // PROXY ROUTES: Connect to BACKEND URL directly
  const backendUrl = config.backend.url;
  const apiKey = config.sdk.adminApiKey;

  // If already connected to the same endpoint with the same API key, return cached instance
  if (proxySdkInstance && proxyConnectionPromise && proxyEndpoint === backendUrl && proxyApiKey === apiKey) {
    await proxyConnectionPromise;
    return proxySdkInstance;
  }

  // Create new SDK instance for proxy routes
  if (!proxySdkInstance) {
    proxySdkInstance = createSDKInstance();
  }

  // Create new connection promise
  const timeout = 5000; // 5 second timeout
  proxyConnectionPromise = Promise.race([
    proxySdkInstance.connect({
      endpoint: backendUrl, // Backend URL (port 3470) - SDK will add /krapi/k1 path internally
      apiKey,
      retry: SDK_RETRY_CONFIG,
      initializeClients: true,
      timeout,
    } as unknown as Parameters<typeof proxySdkInstance.connect>[0]),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Proxy SDK connection timeout")), timeout)
    ),
  ]).then(() => {
    proxyEndpoint = backendUrl;
    proxyApiKey = apiKey;
    proxySessionToken = null; // Clear session token when using API key
  }).catch((error) => {
    proxyConnectionPromise = null; // Reset on failure
    proxySdkInstance = null;
    throw error;
  });

  await proxyConnectionPromise;
  return proxySdkInstance;
}

/**
 * Create authenticated CLIENT SDK with session token (connects to FRONTEND URL)
 * Used by CLIENT ROUTES (/api/client/krapi/k1/...)
 *
 * @param {string} sessionToken - Session token for authentication
 * @returns {Promise<KrapiWrapper>} Authenticated SDK instance connected to frontend
 */
export async function createAuthenticatedClientSdk(
  sessionToken: string
): Promise<KrapiWrapper> {
  // CLIENT ROUTES: Connect to FRONTEND URL
  const frontendUrl = config.frontend.url;

  // If already connected to the same endpoint with the same session token, return cached instance
  if (clientSdkInstance && clientConnectionPromise && clientEndpoint === frontendUrl && clientSessionToken === sessionToken) {
    await clientConnectionPromise;
    return clientSdkInstance;
  }

  // Create new SDK instance for client routes if needed
  if (!clientSdkInstance) {
    clientSdkInstance = createSDKInstance();
  }

  // Create new connection promise with session token
  const timeout = 5000; // 5 second timeout
  clientConnectionPromise = Promise.race([
    clientSdkInstance.connect({
      endpoint: frontendUrl, // Frontend URL (port 3498) - same as comprehensive test suite
      sessionToken, // Pass token in config so all clients get it
      retry: SDK_RETRY_CONFIG,
      initializeClients: true,
      timeout,
    } as unknown as Parameters<typeof clientSdkInstance.connect>[0]),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Authenticated Client SDK connection timeout")), timeout)
    ),
  ]).then(() => {
    clientEndpoint = frontendUrl;
    clientSessionToken = sessionToken;
    clientApiKey = null; // Clear API key when using session token
  }).catch((error) => {
    clientConnectionPromise = null; // Reset on failure
    clientSdkInstance = null;
    throw error;
  });

  await clientConnectionPromise;
  return clientSdkInstance;
}

/**
 * Create authenticated PROXY SDK with session token (connects to BACKEND URL)
 * Used by PROXY ROUTES (/api/krapi/k1/...)
 *
 * CRITICAL: Pass sessionToken in connect() config so ALL HTTP clients get the token.
 * The SDK's setSessionToken() only updates the auth client, not other clients.
 * By reconnecting with sessionToken in config, ALL clients get the token.
 *
 * @param {string} sessionToken - Session token for authentication
 * @returns {Promise<KrapiWrapper>} Authenticated SDK instance connected to backend
 */
export async function createAuthenticatedBackendSdk(
  sessionToken: string
): Promise<KrapiWrapper> {
  // PROXY ROUTES: Connect to BACKEND URL directly
  const backendUrl = config.backend.url;

  // If already connected to the same endpoint with the same session token, return cached instance
  if (proxySdkInstance && proxyConnectionPromise && proxyEndpoint === backendUrl && proxySessionToken === sessionToken) {
    await proxyConnectionPromise;
    return proxySdkInstance;
  }

  // Create new SDK instance for proxy routes if needed
  if (!proxySdkInstance) {
    proxySdkInstance = createSDKInstance();
  }

  // Create new connection promise with session token
  const timeout = 5000; // 5 second timeout
  proxyConnectionPromise = Promise.race([
    proxySdkInstance.connect({
      endpoint: backendUrl, // Backend URL (port 3470) - SDK will add /krapi/k1 path internally
      sessionToken, // Pass token in config so all clients get it
      retry: SDK_RETRY_CONFIG,
      initializeClients: true,
      timeout,
    } as unknown as Parameters<typeof proxySdkInstance.connect>[0]),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Authenticated Proxy SDK connection timeout")), timeout)
    ),
  ]).then(() => {
    proxyEndpoint = backendUrl;
    proxySessionToken = sessionToken;
    proxyApiKey = null; // Clear API key when using session token
  }).catch((error) => {
    proxyConnectionPromise = null; // Reset on failure
    proxySdkInstance = null;
    throw error;
  });

  await proxyConnectionPromise;
  return proxySdkInstance;
}
