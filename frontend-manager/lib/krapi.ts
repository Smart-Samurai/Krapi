import {
  KrapiSDK,
  Scope,
  ProjectScope,
  AdminRole,
  AccessLevel,
  type ApiKey,
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
  type EmailConfig,
  type EmailTemplate,
  type EmailSendRequest,
} from "@krapi/sdk";

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

// Note: ExtendedKrapiSDK removed due to type compatibility issues
// Use the base KrapiSDK class instead

// Re-export all types and values for convenience
export {
  KrapiSDK,
  Scope,
  ProjectScope,
  AdminRole,
  AccessLevel,
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
};
