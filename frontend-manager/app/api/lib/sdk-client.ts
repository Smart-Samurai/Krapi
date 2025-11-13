import { krapi } from "@smartsamurai/krapi-sdk";

// Initialize the SDK connection to the backend with enhanced features
// Note: Server-side code can connect directly to backend (port 3470)
// The SDK will automatically handle path normalization and provide warnings if needed
const connectConfig: any = {
  endpoint: process.env.KRAPI_BACKEND_URL || "http://localhost:3470",
  apiKey: process.env.ADMIN_API_KEY || "admin-api-key",
  // Enable retry logic for better reliability (if SDK supports it)
  retry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
};

krapi
  .connect(connectConfig)
  .then(async () => {
    // Perform health check after connection (if SDK supports it)
    try {
      if (typeof (krapi as any).healthCheck === 'function') {
        const isHealthy = await (krapi as any).healthCheck();
        if (!isHealthy) {
          console.warn("⚠️ SDK health check failed - connection may be unstable");
        } else {
          console.log("✅ SDK connected and healthy");
        }
      }
    } catch (error) {
      console.warn("⚠️ SDK health check error:", error);
    }
  })
  .catch((error: unknown) => {
    console.error("❌ Failed to connect SDK to backend:", error);
  });

// Export the configured SDK instance
export const serverSdk = krapi;

// Helper to create authenticated SDK instance
export function createAuthenticatedSdk(_token: string): typeof krapi {
  // Set the session token on the main SDK instance
  krapi.auth.setSessionToken(_token);
  return krapi;
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
