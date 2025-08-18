/**
 * KRAPI TypeScript SDK
 *
 * A type-safe SDK for building KRAPI applications with perfect client/server parity
 *
 * MAIN INTERFACE (Recommended):
 * - krapi: Global singleton that works seamlessly in both client and server environments
 * - Perfect "plug and socket" design - client methods fit server methods exactly
 *
 * USAGE EXAMPLES:
 *
 * Client App:
 * ```typescript
 * import { krapi } from '@krapi/sdk';
 * await krapi.connect({ endpoint: 'https://api.example.com/krapi/k1', apiKey: 'key' });
 * const project = await krapi.projects.create({ name: 'My Project' });
 * ```
 *
 * Server App:
 * ```typescript
 * import { krapi } from '@krapi/sdk';
 * await krapi.connect({ database: dbConnection });
 * const project = await krapi.projects.create({ name: 'My Project' }); // Same method!
 * ```
 *
 * ALTERNATIVE INTERFACES (For advanced use cases):
 * - Individual services can be imported directly for fine-grained control
 * - Legacy SDKs are deprecated but still supported
 */

// MAIN INTERFACE - PERFECT PLUG AND SOCKET DESIGN
export { krapi, KrapiWrapper } from "./krapi";
export type { KrapiConfig } from "./krapi";
export type { KrapiSocketInterface } from "./socket-interface";

// Export core types and interfaces
export type {
  DatabaseConnection,
  Logger,
  DatabaseSDKConfig,
  HttpSDKConfig,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  BaseClient,
  SDKError,
  Environment,
} from "./core";
export { FieldType } from "./core";

// LEGACY INTERFACES (for backward compatibility - DEPRECATED)
// Note: These are maintained for compatibility but krapi singleton is recommended
export { BackendSDK } from "./backend-sdk";
// Legacy unified client exports removed - use the new krapi singleton instead

// Note: FrontendSDK removed - use krapi singleton instead

// Export shared interfaces and types
// export * from "./interfaces"; // Temporarily disabled until types migration is complete
// export * from "./types"; // Temporarily disabled until types migration is complete

// Export key enums explicitly for better IDE support
export { AdminRole, AccessLevel, Scope, ProjectScope } from "./types";

// Export the main SDK class (krapi singleton is the default)

// Export database health management system - temporarily disabled
// export { DatabaseHealthManager } from "./database-health";
// export { PostgreSQLAutoFixer } from "./postgresql-auto-fixer";
// export { SchemaGenerator } from "./schema-generator";

// Export all individual services (can be used directly)
export { AdminService } from "./admin-service";
export { AuthService } from "./auth-service";
export { CollectionsSchemaManager } from "./collections-schema-manager";
export { CollectionsService } from "./collections-service";
export { CollectionsTypeManager } from "./collections-type-manager";
export { CollectionsTypeValidator } from "./collections-type-validator";
export { EmailService } from "./email-service";
export { HealthService } from "./health-service";
export { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
export { ProjectsService } from "./projects-service";
export { StorageService } from "./storage-service";
export { SystemService } from "./system-service";

export { UsersService } from "./users-service";

// Export HTTP clients for granular frontend control
export { AuthHttpClient } from "./http-clients/auth-http-client";
export { ProjectsHttpClient } from "./http-clients/projects-http-client";
export { CollectionsHttpClient } from "./http-clients/collections-http-client";
export { BaseHttpClient } from "./http-clients/base-http-client";

// Export examples and utilities
export {
  TaskManager as PlugSocketTaskManager,
  clientExample,
  serverExample,
  sharedBusinessLogic,
  demonstratePerfectFit,
} from "./plug-socket-example";
export {
  SocketVerification,
  runSocketVerification,
} from "./socket-verification";
export * from "./examples";

// Export service types
export type {
  AdminUser,
  ApiKey,
  SystemStats,
  ActivityLog,
  DatabaseHealth,
  DiagnosticResult,
} from "./admin-service";

export type {
  Session,
  LoginRequest,
  LoginResponse,
  ApiKeyAuthRequest,
  ApiKeyAuthResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
} from "./auth-service";

export type {
  Document,
  DocumentFilter,
  DocumentQueryOptions,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from "./collections-service";

export type {
  EmailConfig,
  EmailTemplate,
  EmailRequest,
  EmailResult,
} from "./email-service";

export type {
  HealthDiagnostics,
  DatabaseHealthStatus,
  SystemHealthStatus,
  ServiceHealthStatus,
} from "./health-service";

export type {
  Project,
  ProjectSettings,
  ProjectStatistics,
  ProjectApiKey,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "./projects-service";

export type {
  StoredFile,
  FileFolder,
  FileVersion,
  FilePermission,
  UploadRequest,
  FileFilter,
  StorageStatistics,
  StorageQuota,
} from "./storage-service";

export type {
  ProjectUser,
  UserRole,
  UserSession,
  UserActivity,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilter,
  UserStatistics,
} from "./users-service";
