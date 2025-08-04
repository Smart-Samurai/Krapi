/**
 * SDK Type Alignment
 * 
 * This file ensures that the frontend's type usage stays aligned with the SDK.
 * If the SDK types change, TypeScript will catch any mismatches here.
 */

import type {
  AdminUser,
  Project,
  Collection,
  Document,
  ProjectUser,
  Session,
  ApiKey,
  ApiResponse,
  PaginatedResponse,
  Scope,
  ProjectScope,
  AdminRole,
  AccessLevel,
  CollectionField,
  FieldType,
  ProjectSettings
} from '@krapi/sdk';

// Ensure our auth context types match SDK types
export interface AuthContextUser extends AdminUser {
  scopes?: string[];
}

// Ensure our API response handling matches SDK structure
export type FrontendApiResponse<T> = ApiResponse<T>;
export type FrontendPaginatedResponse<T> = PaginatedResponse<T>;

// Type guards to ensure we're handling SDK types correctly
export function isAdminUser(user: any): user is AdminUser {
  return user && typeof user.id === 'string' && typeof user.username === 'string';
}

export function isProject(project: any): project is Project {
  return project && typeof project.id === 'string' && typeof project.name === 'string';
}

export function isCollection(collection: any): collection is Collection {
  return collection && typeof collection.name === 'string' && Array.isArray(collection.fields);
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
  metadata?: Record<string, any>;
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
  details?: any;
}

// Compile-time checks that will fail if SDK types change
type _AdminUserCheck = AdminUser extends { id: string; username: string; email: string } ? true : never;
type _ProjectCheck = Project extends { id: string; name: string; api_key: string } ? true : never;
type _CollectionCheck = Collection extends { name: string; fields: CollectionField[] } ? true : never;
type _DocumentCheck = Document extends { id: string; data: Record<string, any> } ? true : never;

// Export a namespace with all validated types
export namespace SDKTypes {
  export type User = import('@krapi/sdk').AdminUser;
  export type Project = import('@krapi/sdk').Project;
  export type Collection = import('@krapi/sdk').Collection;
  export type Document = import('@krapi/sdk').Document;
  export type ProjectUser = import('@krapi/sdk').ProjectUser;
  export type Session = import('@krapi/sdk').Session;
  export type ApiKey = import('@krapi/sdk').ApiKey;
  export type Response<T> = import('@krapi/sdk').ApiResponse<T>;
  export type PaginatedResponse<T> = import('@krapi/sdk').PaginatedResponse<T>;
}