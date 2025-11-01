/**
 * KRAPI Frontend Integration
 *
 * This module provides a clean interface to the KRAPI SDK for frontend use.
 * All types and methods come directly from the SDK - no custom implementations.
 */

import {
  krapi,
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
  AdminRole,
  AccessLevel,
  Scope,
  ProjectScope,
  FieldType,
} from "@krapi/sdk";

// Note: These functions are no longer needed since we're using the krapi singleton directly
// The frontend should use the krapi singleton from @krapi/sdk instead

// Re-export ALL SDK types and classes for frontend use
export {
  krapi,
  AdminRole,
  AccessLevel,
  Scope,
  ProjectScope,
  FieldType,
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
};

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
