import { KrapiSDK } from "@krapi/sdk";
import type { AdminRole, AccessLevel, ApiKey, ApiResponse } from "@krapi/sdk";

/**
 * Create a default KRAPI client with base configuration
 * This function creates an SDK instance without authentication
 * Authentication should be added later via setSessionToken or setApiKey
 */
export function createDefaultKrapi(baseUrl?: string): KrapiSDK {
  const url =
    baseUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3470/krapi/k1";

  return new KrapiSDK({
    baseUrl: url,
  });
}

/**
 * Create a KRAPI client with session token authentication
 */
export function createKrapiWithSession(
  sessionToken: string,
  baseUrl?: string
): KrapiSDK {
  const url =
    baseUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3470/krapi/k1";

  return new KrapiSDK({
    baseUrl: url,
    sessionToken,
  });
}

/**
 * Create a KRAPI client with API key authentication
 */
export function createKrapiWithApiKey(
  apiKey: string,
  baseUrl?: string
): KrapiSDK {
  const url =
    baseUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3470/krapi/k1";

  return new KrapiSDK({
    baseUrl: url,
    apiKey,
  });
}

// Extend the KrapiSDK class to include the createMasterApiKey method
export class ExtendedKrapiSDK extends KrapiSDK {
  admin: any = {
    ...this.admin,
    // Create master API key
    createMasterApiKey: async (data: {
      name: string;
      scopes: string[];
    }): Promise<ApiResponse<ApiKey>> => {
      const response = await (this as any).client.post(
        "/admin/master-api-keys",
        data
      );
      return response.data;
    },
  };
}

// Export the SDK class and types for convenience
export { KrapiSDK } from "@krapi/sdk";

// Re-export all types
export {
  type ApiResponse,
  type PaginatedResponse,
  type AdminUser,
  type AdminPermission,
  type Project,
  type ProjectSettings,
  type ProjectStats,
  type Collection,
  type CollectionField,
  type CollectionIndex,
  type Document,
  type FileInfo,
  type StorageStats,
  type Session,
  type QueryOptions,
  type ProjectUser,
  type ApiKey,
  type EmailConfig,
  type EmailTemplate,
  type EmailSendRequest,
  AdminRole,
  AccessLevel,
} from "@krapi/sdk";

export { Scope, ProjectScope } from "@krapi/sdk";
