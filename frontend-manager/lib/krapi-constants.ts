/**
 * KRAPI Constants
 * 
 * Local definitions of SDK enums/constants to avoid bundling SDK in client components.
 * These match the values from @smartsamurai/krapi-sdk but are defined locally.
 */

// Admin Roles
export const AdminRole = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MASTER_ADMIN: "master_admin",
  DEVELOPER: "developer",
} as const;

// Access Levels
export const AccessLevel = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  ADMIN: "admin",
  FULL: "full",
  READ_WRITE: "read_write",
  READ_ONLY: "read_only",
} as const;

// Global Scopes
export const Scope = {
  MASTER: "master",
  ADMIN_READ: "admin:read",
  ADMIN_WRITE: "admin:write",
  ADMIN_DELETE: "admin:delete",
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  PROJECTS_DELETE: "projects:delete",
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  COLLECTIONS_READ: "collections:read",
  COLLECTIONS_WRITE: "collections:write",
  COLLECTIONS_DELETE: "collections:delete",
  DOCUMENTS_READ: "documents:read",
  DOCUMENTS_WRITE: "documents:write",
  DOCUMENTS_DELETE: "documents:delete",
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
  FILES_DELETE: "files:delete",
  STORAGE_READ: "storage:read",
  STORAGE_WRITE: "storage:write",
  STORAGE_DELETE: "storage:delete",
  EMAIL_SEND: "email:send",
  FUNCTIONS_EXECUTE: "functions:execute",
} as const;

// Project Scopes
export const ProjectScope = {
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  COLLECTIONS_READ: "collections:read",
  COLLECTIONS_WRITE: "collections:write",
  COLLECTIONS_DELETE: "collections:delete",
  DOCUMENTS_READ: "documents:read",
  DOCUMENTS_WRITE: "documents:write",
  DOCUMENTS_DELETE: "documents:delete",
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
  FILES_DELETE: "files:delete",
  EMAIL_SEND: "email:send",
  FUNCTIONS_EXECUTE: "functions:execute",
} as const;

// Field Types (using lowercase keys to match SDK usage)
export const FieldType = {
  string: "string",
  text: "text",
  number: "number",
  integer: "integer",
  float: "float",
  boolean: "boolean",
  date: "date",
  datetime: "datetime",
  time: "time",
  timestamp: "timestamp",
  array: "array",
  object: "object",
  uniqueID: "uniqueID",
  uuid: "uuid",
  relation: "relation",
  reference: "reference",
  json: "json",
  email: "email",
  url: "url",
  phone: "phone",
  password: "password",
  file: "file",
  image: "image",
  video: "video",
  audio: "audio",
  enum: "enum",
  encrypted: "encrypted",
  varchar: "varchar",
  decimal: "decimal",
} as const;

// Type exports for TypeScript
export type AdminRole = typeof AdminRole[keyof typeof AdminRole];
export type AccessLevel = typeof AccessLevel[keyof typeof AccessLevel];
export type Scope = typeof Scope[keyof typeof Scope];
export type ProjectScope = typeof ProjectScope[keyof typeof ProjectScope];
export type FieldType = typeof FieldType[keyof typeof FieldType];

