import { krapi } from "@krapi/sdk";

// Initialize the SDK connection to the backend
krapi
  .connect({
    endpoint: process.env.BACKEND_URL || "http://localhost:3470",
    apiKey: process.env.ADMIN_API_KEY || "admin-api-key",
  })
  .catch((error) => {
    // Failed to connect SDK to backend
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
