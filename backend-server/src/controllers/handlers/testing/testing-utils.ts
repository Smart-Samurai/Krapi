import { krapi } from "@smartsamurai/krapi-sdk";

import { AuthenticatedRequest } from "@/types";

/**
 * Utility functions for testing handlers
 */

/**
 * Check if testing is enabled
 */
export function isTestingEnabled(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const testingEnabled = process.env.ENABLE_TESTING === "true" || process.env.ALLOW_TESTING === "true";
  return !isProduction || testingEnabled;
}

/**
 * Get API key from request
 */
export async function getApiKey(req: AuthenticatedRequest): Promise<string> {
  if (req.apiKey?.key) {
    return req.apiKey.key;
  }
  if (req.session?.token) {
    return process.env.ADMIN_API_KEY || "admin-api-key";
  }
  return process.env.ADMIN_API_KEY || "admin-api-key";
}

/**
 * Initialize SDK connection
 * Updated for SDK 0.6.0: uses { attempts, delay } format
 */
export async function initializeSDK(apiKey: string, frontendUrl: string): Promise<void> {
  await krapi.connect({
    endpoint: frontendUrl,
    apiKey,
    retry: { attempts: 3, delay: 1000 },
  } as unknown as Parameters<typeof krapi.connect>[0]);
}

/**
 * Get frontend URL
 */
export function getFrontendUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.KRAPI_FRONTEND_URL ||
    "http://localhost:3498"
  );
}








