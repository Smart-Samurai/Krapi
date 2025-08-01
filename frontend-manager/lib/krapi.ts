import { KrapiClient } from "@krapi/sdk";
import type { AdminRole, AccessLevel } from "@krapi/sdk";

/**
 * Create a default Krapi client instance
 * 
 * Uses the API URL from environment variables or defaults to localhost.
 * The SDK expects the full API base URL including /krapi/k1.
 * 
 * @returns Configured KrapiClient instance
 */
export function createDefaultKrapi(): KrapiClient {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/krapi/k1";

  return new KrapiClient({
    baseUrl: baseURL,
  });
}

/**
 * Create a Krapi client with custom configuration
 * 
 * @param config - Configuration object
 * @param config.baseURL - Full API base URL including /krapi/k1
 * @param config.apiKey - Optional API key for authentication
 * @param config.authToken - Optional session token for authentication
 * @returns Configured KrapiClient instance
 */
export function createKrapi(config: {
  baseURL: string;
  apiKey?: string;
  authToken?: string;
}): KrapiClient {
  return new KrapiClient({
    baseUrl: config.baseURL,
    apiKey: config.apiKey,
    sessionToken: config.authToken,
  });
}

// Re-export types and client for convenience
export { KrapiClient } from "@krapi/sdk";
export type {
  ApiResponse,
  PaginatedResponse,
  Project,
  Document,
  AdminUser,
  AdminPermission,
  ProjectSettings,
  ProjectStats,
  FileInfo,
  StorageStats,
  ProjectUser,
  QueryOptions,
  AdminRole,
  AccessLevel,
  Collection,
  CollectionField,
  CollectionIndex,
  ApiKey,
} from "@krapi/sdk";

export { Scope, ProjectScope } from "@krapi/sdk";
