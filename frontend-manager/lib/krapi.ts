import { KrapiClient } from "@krapi/sdk";
import type { AdminRole, AccessLevel } from "@krapi/sdk";

/**
 * Create a default Krapi client instance
 * This will use the configuration from environment variables
 */
export function createDefaultKrapi(): KrapiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/krapi/k1";
  // Remove /krapi/k1 from the baseURL since SDK appends it
  const cleanBaseURL = baseURL.replace(/\/krapi\/k1\/?$/, '');
  
  return new KrapiClient({
    baseUrl: cleanBaseURL,
  });
}

/**
 * Create a Krapi client with custom configuration
 */
export function createKrapi(config: {
  baseURL: string;
  apiKey?: string;
  authToken?: string;
}): KrapiClient {
  return new KrapiClient({
    baseUrl: config.baseURL,
    apiKey: config.apiKey,
    sessionToken: config.authToken
  });
}

// Re-export types and client for convenience
export { KrapiClient } from "@krapi/sdk";
export type { 
  ApiResponse, 
  PaginatedResponse, 
  Project, 
  TableSchema, 
  Document,
  AdminUser,
  AdminPermission,
  ProjectSettings,
  ProjectStats,
  TableField,
  TableIndex,
  FileInfo,
  StorageStats,
  ProjectUser,
  QueryOptions,
  AdminRole,
  AccessLevel
} from "@krapi/sdk";