/**
 * KRAPI Frontend Integration
 *
 * This module provides a clean interface to the KRAPI SDK for frontend use.
 * All types and methods come directly from the SDK - no custom implementations.
 *
 * Re-exports all SDK types. The krapi instance should be imported dynamically
 * in client components to avoid bundling server-only dependencies.
 *
 * @module lib/krapi
 * @example
 * // For types (safe in client components):
 * import type { Project } from '@/lib/krapi';
 *
 * // For SDK instance (use dynamic import in client components):
 * const { krapi } = await import('@smartsamurai/krapi-sdk');
 */

// Only import types from SDK - these are safe for client components
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  ProjectSettings,
  ProjectListOptions,
  Collection,
  Document,
  ProjectUser,
  FileInfo,
  StorageStatistics,
  Session,
  QueryOptions,
  ApiKey,
  EmailConfig,
  EmailTemplate,
  StoredFile,
  AdminUser,
  CollectionField,
  AdminPermission,
  ProjectStatistics,
  EmailRequest,
  ProjectStatus,
  KrapiWrapper,
} from "@smartsamurai/krapi-sdk";

// Note: Enums are imported as types to avoid bundling SDK in client
// If you need enum values, import them directly from @smartsamurai/krapi-sdk in server components only
// For client components, use string literals or define local constants

// Note: These functions are no longer needed since we're using the krapi singleton directly
// The frontend should use the krapi singleton from @smartsamurai/krapi-sdk instead

// Re-export constants from local definitions (safe for client components)
export {
  AdminRole,
  AccessLevel,
  Scope,
  ProjectScope,
  FieldType,
  type AdminRole as AdminRoleType,
  type AccessLevel as AccessLevelType,
  type Scope as ScopeType,
  type ProjectScope as ProjectScopeType,
  type FieldType as FieldTypeType,
} from "./krapi-constants";

// Re-export types (safe for client components)
export {
  type ApiResponse,
  type PaginatedResponse,
  type Project,
  type ProjectSettings,
  type ProjectListOptions,
  type Collection,
  type Document,
  type ProjectUser,
  type FileInfo,
  type StorageStatistics,
  type Session,
  type QueryOptions,
  type ApiKey,
  type EmailConfig,
  type EmailTemplate,
  type StoredFile,
  type AdminUser,
  type CollectionField,
  type AdminPermission,
  type ProjectStatistics,
  type EmailRequest,
  type ProjectStatus,
  type KrapiWrapper,
};

/**
 * Get KRAPI SDK instance (for server components/API routes only)
 *
 * NOTE: This function should NEVER be called from client components.
 * Client components must use API routes instead.
 *
 * @deprecated Use API routes instead of direct SDK access in client components
 */
export async function getKrapiSDK() {
  // Only import in server context
  if (typeof window !== "undefined") {
    throw new Error(
      "getKrapiSDK() cannot be called from client components. Use API routes instead."
    );
  }
  const { krapi } = await import("@smartsamurai/krapi-sdk");
  return krapi;
}

// Frontend compatibility: use SDK data structure directly
// The frontend should adapt to use what the SDK provides, not transform it

// Note: All helper functions removed - frontend should use SDK data directly
// Project.is_active instead of Project.active
// ProjectUser.permissions instead of ProjectUser.access_scopes
// ProjectUser.metadata instead of ProjectUser.custom_fields
// StorageStatistics.storage_used_percentage instead of StorageStatistics.usage_percentage

// Type aliases for backward compatibility
export type StorageStats = StorageStatistics;
export type ProjectStats = ProjectStatistics;
export type EmailSendRequest = EmailRequest;
export type CollectionIndex = {
  name: string;
  fields: string[];
  unique?: boolean;
};
