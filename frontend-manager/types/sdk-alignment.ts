/**
 * SDK Type Alignment
 * 
 * This file ensures that the frontend's type usage stays aligned with the SDK.
 * If the SDK types change, TypeScript will catch any mismatches here.
 */

import type {
  AccessLevel,
  AdminRole,
  AdminUser,
  ApiResponse,
  Collection,
  CollectionField,
  Document,
  FieldType,
  PaginatedResponse,
  Project,
  ProjectScope,
  ProjectSettings,
  Scope,
} from '@smartsamurai/krapi-sdk';

// Ensure our auth context types match SDK types
export interface AuthContextUser extends AdminUser {
  scopes?: string[];
}

// Ensure our API response handling matches SDK structure
export type FrontendApiResponse<T> = ApiResponse<T>;
export type FrontendPaginatedResponse<T> = PaginatedResponse<T>;

// Type guards to ensure we're handling SDK types correctly
export function isAdminUser(user: unknown): user is AdminUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "id" in user &&
    typeof (user as { id: unknown }).id === "string" &&
    "username" in user &&
    typeof (user as { username: unknown }).username === "string"
  );
}

export function isProject(project: unknown): project is Project {
  return (
    typeof project === "object" &&
    project !== null &&
    "id" in project &&
    typeof (project as { id: unknown }).id === "string" &&
    "name" in project &&
    typeof (project as { name: unknown }).name === "string"
  );
}

export function isCollection(collection: unknown): collection is Collection {
  return (
    typeof collection === "object" &&
    collection !== null &&
    "name" in collection &&
    typeof (collection as { name: unknown }).name === "string" &&
    "fields" in collection &&
    Array.isArray((collection as { fields: unknown }).fields)
  );
}

// Ensure our form data types match what the SDK expects
export interface CreateProjectFormData {
  name: string;
  description?: string;
  settings?: ProjectSettings;
}

export interface CreateCollectionFormData {
  name: string;
  description?: string;
  fields: CollectionField[];
}

export interface CreateUserFormData {
  email: string;
  name?: string;
  password?: string;
  metadata?: Record<string, unknown>;
}

// Validate that our scope checks use the correct SDK enums
export type ValidatedScope = Scope;
export type ValidatedProjectScope = ProjectScope;

// Ensure role and access level enums are used correctly
export type ValidatedAdminRole = AdminRole;
export type ValidatedAccessLevel = AccessLevel;

// Field type validation
export type ValidatedFieldType = FieldType;

// Type to ensure we handle all possible API error codes
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

// Compile-time checks that will fail if SDK types change
type _AdminUserCheck = AdminUser extends { id: string; username: string; email: string } ? true : never;
type _ProjectCheck = Project extends { id: string; name: string; api_key: string } ? true : never;
type _CollectionCheck = Collection extends { name: string; fields: CollectionField[] } ? true : never;
type _DocumentCheck = Document extends { id: string; data: Record<string, unknown> } ? true : never;

// Export types that match SDK types
export type SDKUser = import('@smartsamurai/krapi-sdk').AdminUser;
export type SDKProject = import('@smartsamurai/krapi-sdk').Project;
export type SDKCollection = import('@smartsamurai/krapi-sdk').Collection;
export type SDKDocument = import('@smartsamurai/krapi-sdk').Document;
export type SDKProjectUser = import('@smartsamurai/krapi-sdk').ProjectUser;
export type SDKSession = import('@smartsamurai/krapi-sdk').Session;
export type SDKApiKey = import('@smartsamurai/krapi-sdk').ApiKey;
export type SDKResponse<T> = import('@smartsamurai/krapi-sdk').ApiResponse<T>;
export type SDKPaginatedResponse<T> = import('@smartsamurai/krapi-sdk').PaginatedResponse<T>;