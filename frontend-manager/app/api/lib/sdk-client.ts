import { createKrapiClient, KrapiClient } from '@/lib/krapi-sdk';

// Get backend URL from environment variables
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Create a new SDK client instance
 * @param authToken Optional auth token for authenticated requests
 * @returns KrapiClient instance
 */
export function createBackendClient(authToken?: string): KrapiClient {
  const config: { baseURL: string; authToken?: string } = { baseURL: BACKEND_URL };
  if (authToken) config.authToken = authToken;
  return createKrapiClient(config);
}

/**
 * Extract auth token from request headers
 * @param headers Request headers
 * @returns Auth token or undefined
 */
export function getAuthToken(headers: Headers): string | undefined {
  const authorization = headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.substring(7);
  }
  return undefined;
}