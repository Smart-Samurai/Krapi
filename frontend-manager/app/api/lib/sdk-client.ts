import { KrapiSDK } from "@krapi/sdk";

// Default SDK client for server-side usage
export const serverSdk = new KrapiSDK({
  baseUrl: process.env.KRAPI_API_URL || "http://localhost:3470",
});

// Helper to create authenticated SDK instance
export function createAuthenticatedSdk(token: string): KrapiSDK {
  const sdk = new KrapiSDK({
    baseUrl: process.env.KRAPI_API_URL || "http://localhost:3470",
  });
  
  sdk.setSessionToken(token);
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
