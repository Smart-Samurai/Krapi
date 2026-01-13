/**
 * SDK Client for API Routes
 *
 * This module provides SDK access for API routes only.
 * IMPORTANT: The SDK is imported dynamically to prevent initialization during build.
 * The SDK should NEVER be imported in client components.
 *
 * @deprecated This module uses the singleton SDK pattern which can cause connection conflicts.
 * For new code, use `backend-sdk-client.ts` instead which uses `createSDKInstance()`.
 * This module is kept for backward compatibility and the `getAuthToken()` utility function.
 *
 * SDK 0.5.20+: Updated to use createSDKInstance() to avoid connection conflicts.
 */

import { createSDKInstance, KrapiWrapper } from "@smartsamurai/krapi-sdk";
import { NextRequest } from "next/server";

import { config, SDK_RETRY_CONFIG } from "@/lib/config";

// Store the SDK instance once loaded
let krapiInstance: KrapiWrapper | null = null;
let connectionPromise: Promise<void> | null = null;

/**
 * Dynamically import and connect the SDK
 * This function is only called at runtime, never during build
 * 
 * @deprecated Use backend-sdk-client.ts functions instead
 */
async function importSDK(): Promise<KrapiWrapper> {
  // Create SDK instance if not already created
  if (!krapiInstance) {
    krapiInstance = createSDKInstance();
  }

  // Connect if not already connected
  if (!connectionPromise) {
    // SDK-FIRST: Use centralized config for frontend URL
    // SDK should connect to FRONTEND URL (not backend) so requests go through the proxy
    const frontendUrl = config.frontend.url;
    const connectConfig = {
      endpoint: frontendUrl,
      apiKey: config.sdk.adminApiKey,
      retry: SDK_RETRY_CONFIG,
    } as unknown as Parameters<typeof krapiInstance.connect>[0];

    connectionPromise = krapiInstance
      .connect(connectConfig)
      .then(async () => {
        try {
          const krapiWithHealthCheck = krapiInstance as KrapiWrapper & {
            healthCheck?: () => Promise<boolean>;
          };
          if (typeof krapiWithHealthCheck.healthCheck === "function") {
            // Skip health check on initial connection to speed up login
            // Health check can be done separately if needed
            // const isHealthy = await krapiWithHealthCheck.healthCheck();
            // if (!isHealthy) {
            //   console.warn("⚠️ SDK health check failed - connection may be unstable");
            // } else {
            //   console.log("✅ SDK connected and healthy");
            // }
          }
        } catch (_error) {
          // Silently ignore health check errors during connection
          // Health check can be done separately if needed
        }
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("❌ Failed to connect SDK to frontend:", error);
      });
  }

  await connectionPromise;
  return krapiInstance;
}

/**
 * Get the SDK instance (lazy-loaded)
 * Use this in API routes instead of importing krapi directly
 * 
 * @deprecated Use backend-sdk-client.ts functions instead:
 * - For proxy routes: use `getBackendSdkClient()` or `createAuthenticatedBackendSdk()`
 * - For client routes: use `getClientSdkClient()` or `createAuthenticatedClientSdk()`
 */
export async function getServerSdk(): Promise<KrapiWrapper> {
  if (!krapiInstance) {
    krapiInstance = await importSDK();
  }
  return krapiInstance;
}

// For backward compatibility with existing code that uses serverSdk synchronously
// This creates a proxy that lazily loads the SDK when properties are accessed
// Note: This only works for async operations - sync property access will return promises
// 
// @deprecated Use backend-sdk-client.ts functions instead
export const serverSdk = new Proxy({} as KrapiWrapper, {
  get(_target, prop) {
    // Return a function that gets the SDK and accesses the property
    // For methods, return a bound function
    // For properties, return a promise that resolves to the value
    return async (...args: unknown[]) => {
      const sdk = await getServerSdk();
      const value = (sdk as unknown as Record<string, unknown>)[prop as string];
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).apply(sdk, args);
      }
      return value;
    };
  },
}) as unknown as KrapiWrapper;

/**
 * Helper to create authenticated SDK instance
 * 
 * @deprecated Use `createAuthenticatedBackendSdk()` from backend-sdk-client.ts instead
 */
export async function createAuthenticatedSdk(
  _token: string
): Promise<KrapiWrapper> {
  const sdk = await getServerSdk();
  // SDK 0.3.3+: setSessionToken() is async and auto-initializes clients if needed
  await sdk.auth.setSessionToken(_token);
  return sdk;
}

/**
 * Extract auth token from request headers or cookies
 * @param request NextRequest object (for accessing headers and cookies)
 * @returns Auth token or undefined
 */
export function getAuthToken(request: NextRequest | Headers): string | undefined {
  // Handle both NextRequest and Headers for backward compatibility
  let headers: Headers;
  let cookies: { get: (name: string) => { value: string } | undefined } | undefined;
  
  if (request instanceof Headers) {
    headers = request;
    cookies = undefined;
  } else {
    headers = request.headers;
    cookies = request.cookies;
  }

  // First, try Authorization header
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.substring(7);
  }

  // Fallback to cookie if header not present
  if (cookies) {
    const sessionTokenCookie = cookies.get("session_token");
    if (sessionTokenCookie?.value) {
      return sessionTokenCookie.value;
    }
  }

  return undefined;
}
