/**
 * SDK Client for API Routes
 * 
 * This module provides SDK access for API routes only.
 * IMPORTANT: The SDK is imported dynamically to prevent initialization during build.
 * The SDK should NEVER be imported in client components.
 */

// Store the SDK instance once loaded
let krapiInstance: Awaited<ReturnType<typeof importSDK>> | null = null;
let connectionPromise: Promise<void> | null = null;

/**
 * Dynamically import and connect the SDK
 * This function is only called at runtime, never during build
 */
async function importSDK() {
  // Dynamic import - this only happens at runtime in API routes
  const { krapi } = await import("@smartsamurai/krapi-sdk");
  
  // Connect if not already connected
  if (!connectionPromise) {
    const connectConfig = {
      endpoint: process.env.KRAPI_BACKEND_URL || "http://localhost:3470",
      apiKey: process.env.ADMIN_API_KEY || "admin-api-key",
      retry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      },
    };

    connectionPromise = krapi
      .connect(connectConfig)
      .then(async () => {
        try {
          const krapiWithHealthCheck = krapi as typeof krapi & { healthCheck?: () => Promise<boolean> };
          if (typeof krapiWithHealthCheck.healthCheck === 'function') {
            const isHealthy = await krapiWithHealthCheck.healthCheck();
            if (!isHealthy) {
              // eslint-disable-next-line no-console
              console.warn("⚠️ SDK health check failed - connection may be unstable");
            } else {
              // eslint-disable-next-line no-console
              console.log("✅ SDK connected and healthy");
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("⚠️ SDK health check error:", error);
        }
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("❌ Failed to connect SDK to backend:", error);
      });
  }

  await connectionPromise;
  return krapi;
}

/**
 * Get the SDK instance (lazy-loaded)
 * Use this in API routes instead of importing krapi directly
 */
export async function getServerSdk() {
  if (!krapiInstance) {
    krapiInstance = await importSDK();
  }
  return krapiInstance;
}

// For backward compatibility with existing code that uses serverSdk synchronously
// This creates a proxy that lazily loads the SDK when properties are accessed
// Note: This only works for async operations - sync property access will return promises
export const serverSdk = new Proxy({} as Awaited<ReturnType<typeof importSDK>>, {
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
}) as unknown as Awaited<ReturnType<typeof importSDK>>;

// Helper to create authenticated SDK instance
export async function createAuthenticatedSdk(_token: string): Promise<Awaited<ReturnType<typeof importSDK>>> {
  const sdk = await getServerSdk();
  sdk.auth.setSessionToken(_token);
  return sdk;
}

/**
 * Extract auth token from request headers
 * @param headers Request headers
 * @returns Auth token or undefined
 */
export function getAuthToken(headers: Headers): string | undefined {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.substring(7);
  }
  return undefined;
}
