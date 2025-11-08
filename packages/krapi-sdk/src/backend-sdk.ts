/**
 * KRAPI Backend SDK
 * 
 * Backend SDK for direct database access and backend operations.
 * This provides real functionality for database health, schema management,
 * collections operations, and auto-fixing capabilities.
 * 
 * Designed for server-side use with direct database connections.
 * All operations use the provided database connection for maximum performance.
 * 
 * @class BackendSDK
 * @example
 * const sdk = new BackendSDK({
 *   databaseConnection: dbConnection,
 *   logger: console
 * });
 * const projects = await sdk.projects.getAllProjects();
 */

import { ActivityLogger } from "./activity-logger";
import { AdminService } from "./admin-service";
import { AuthService } from "./auth-service";
import { BackupService } from "./backup-service";
import { ChangelogService } from "./changelog-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import {
  CollectionsService,
  CreateDocumentRequest,
  DocumentQueryOptions,
} from "./collections-service";
import { CollectionsTypeManager } from "./collections-type-manager";
import { CollectionsTypeValidator } from "./collections-type-validator";
import { DatabaseSDKConfig, Logger } from "./core";
import { DatabaseHealthManager } from "./database-health";
import { EmailService } from "./email-service";
import { HealthService } from "./health-service";
import { MetadataManager } from "./metadata-manager";
import { PerformanceMonitor } from "./performance-monitor";
import { PostgreSQLAutoFixer } from "./postgresql-auto-fixer";
import { ProjectsService } from "./projects-service";
import { SchemaGenerator } from "./schema-generator";
import { SQLiteSchemaInspector } from "./sqlite-schema-inspector";
import { StorageService } from "./storage-service";
import { SystemService } from "./system-service";
import { TestingService } from "./testing-service";
import {
  FieldType,
  Collection,
  CollectionTypeDefinition,
  Document,
} from "./types";
import { UsersService } from "./users-service";

export interface BackendSDKConfig extends DatabaseSDKConfig {
  currentUserId?: string;
}

export class BackendSDK {
  public database: DatabaseHealthManager;
  public autoFixer: PostgreSQLAutoFixer;
  public schemaGenerator: SchemaGenerator;
  public system: SystemService;
  public collections: {
    typeManager: CollectionsTypeManager;
    typeValidator: CollectionsTypeValidator;
    schemaManager: CollectionsSchemaManager;
    service: CollectionsService;
    schemaInspector: SQLiteSchemaInspector;
  };
  public admin: AdminService;
  public auth: AuthService;
  public changelog: ChangelogService;
  public email: EmailService;
  public health: HealthService;
  public projects: ProjectsService;
  public storage: StorageService;
  public users: UsersService;
  public testing: TestingService;
  public activity: ActivityLogger;
  public backup: BackupService;
  public metadata: MetadataManager;
  public performance: PerformanceMonitor;
  public apiKeys: {
    getAll(
      projectId: string,
      options?: Record<string, unknown>
    ): Promise<Record<string, unknown>[]>;
    get(
      projectId: string,
      keyId: string
    ): Promise<Record<string, unknown> | null>;
    create(
      projectId: string,
      keyData: {
        name: string;
        description?: string;
        scopes: string[];
        expires_at?: string;
        created_by?: string;
      }
    ): Promise<Record<string, unknown>>;
    update(
      projectId: string,
      keyId: string,
      updates: Record<string, unknown>
    ): Promise<Record<string, unknown>>;
    delete(projectId: string, keyId: string): Promise<{ success: boolean }>;
    regenerate(
      projectId: string,
      keyId: string
    ): Promise<Record<string, unknown>>;
    validateKey(apiKey: string): Promise<Record<string, unknown>>;
  };

  private config: BackendSDKConfig;
  private logger: Logger;

  /**
   * Set the current user ID for operations that require user context
   * 
   * Sets the user ID that will be used for operations requiring user context
   * (e.g., created_by, updated_by fields).
   * 
   * @param {string} userId - User ID to set as current user
   * @returns {void}
   * 
   * @example
   * sdk.setCurrentUserId('user-id');
   * // All subsequent operations will use this user ID for user context
   */
  setCurrentUserId(userId: string): void {
    this.config.currentUserId = userId;
  }

  /**
   * Create a new BackendSDK instance
   * 
   * Initializes all services with the provided database connection.
   * 
   * @param {BackendSDKConfig} config - SDK configuration
   * @param {DatabaseConnection} config.databaseConnection - Database connection (required)
   * @param {Logger} [config.logger] - Logger instance (default: console)
   * @param {boolean} [config.enableAutoFix] - Enable automatic schema fixes
   * @param {boolean} [config.enableHealthChecks] - Enable health checks
   * @param {number} [config.maxRetries] - Maximum retry attempts
   * @param {string} [config.currentUserId] - Current user ID for operations
   * @throws {Error} If database connection is invalid
   * 
   * @example
   * const sdk = new BackendSDK({
   *   databaseConnection: dbConnection,
   *   logger: console,
   *   enableAutoFix: true
   * });
   */
  constructor(config: BackendSDKConfig) {
    this.config = config;
    this.logger = config.logger || console;

    // Validate database connection
    if (
      !config.databaseConnection ||
      typeof config.databaseConnection.query !== "function"
    ) {
      throw new Error(
        "BackendSDK requires a valid database connection with query method"
      );
    }

    // Initialize real database health manager
    this.database = new DatabaseHealthManager(
      config.databaseConnection,
      this.logger as Console
    );

    // Initialize real auto-fixer with actual database connection
    this.autoFixer = new PostgreSQLAutoFixer(
      config.databaseConnection,
      this.logger as Console
    );

    // Initialize schema generator with real configuration
    this.schemaGenerator = new SchemaGenerator(
      { databaseConnection: config.databaseConnection },
      {
        defaultStringLength: 255,
        defaultDecimalPrecision: 10,
        defaultDecimalScale: 2,
        generateIndexes: true,
        generateConstraints: true,
        generateRelations: true,
      }
    );

    // Initialize system service
    this.system = new SystemService("", ""); // Backend SDK doesn't need HTTP endpoints

    // Initialize collections management system
    // Use SQLite schema inspector since we're using SQLite
    this.collections = {
      typeManager: new CollectionsTypeManager(
        config.databaseConnection,
        this.logger as Console
      ),
      typeValidator: new CollectionsTypeValidator(
        config.databaseConnection,
        this.logger as Console
      ),
      schemaManager: new CollectionsSchemaManager(
        config.databaseConnection,
        this.logger as Console
      ),
      service: new CollectionsService(
        config.databaseConnection,
        this.logger as Console
      ),
      schemaInspector: new SQLiteSchemaInspector(
        config.databaseConnection,
        this.logger as Console
      ),
    };

    // Initialize admin service
    this.admin = new AdminService(config.databaseConnection, this.logger);

    // Initialize auth service
    this.auth = new AuthService(config.databaseConnection, this.logger);

    // Initialize email service
    this.email = new EmailService(config.databaseConnection, this.logger);

    // Initialize API keys functionality using admin service
    this.apiKeys = {
      getAll: async (projectId: string, _options?: Record<string, unknown>) => {
        const result = await this.admin.getProjectApiKeys(projectId);
        return (result as unknown as Record<string, unknown>[]) || [];
      },
      get: async (projectId: string, keyId: string) => {
        const result = await this.admin.getProjectApiKey(keyId, projectId);
        return (result as unknown as Record<string, unknown>) || null;
      },
      create: async (projectId: string, keyData: Record<string, unknown>) => {
        const result = await this.admin.createProjectApiKey(
          projectId,
          keyData as {
            name: string;
            description?: string;
            scopes: string[];
            expires_at?: string;
            created_by?: string;
          }
        );
        return result as unknown as Record<string, unknown>;
      },
      update: async (
        projectId: string,
        keyId: string,
        updates: Record<string, unknown>
      ) => {
        const result = await this.admin.updateProjectApiKey(
          keyId,
          projectId,
          updates
        );
        return result as unknown as Record<string, unknown>;
      },
      delete: async (projectId: string, keyId: string) => {
        const success = await this.admin.deleteProjectApiKey(keyId, projectId);
        return { success };
      },
      regenerate: async (projectId: string, keyId: string) => {
        const result = await this.admin.regenerateProjectApiKey(
          keyId,
          projectId
        );
        return result as unknown as Record<string, unknown>;
      },
      validateKey: async (apiKey: string) => {
        try {
          const result = await config.databaseConnection.query(
            `SELECT id, name, type, scopes, project_ids 
             FROM api_keys 
             WHERE key = $1 AND is_active = true`,
            [apiKey]
          );

          if (result.rows.length === 0) {
            return { valid: false };
          }

          const keyData = result.rows[0] as Record<string, unknown>;
          return {
            valid: true,
            key_info: {
              id: keyData.id,
              name: keyData.name,
              type: keyData.type,
              scopes: keyData.scopes || [],
              project_id: keyData.project_ids?.[0],
            },
          };
        } catch {
          return { valid: false };
        }
      },
    };

    // Initialize health service
    this.health = new HealthService(config.databaseConnection, this.logger);

    // Initialize projects service
    this.projects = new ProjectsService(config.databaseConnection, this.logger);

    // Initialize storage service
    this.storage = new StorageService(config.databaseConnection, this.logger);

    // Initialize users service
    this.users = new UsersService(config.databaseConnection, this.logger);

    // Initialize testing service
    this.testing = new TestingService(config.databaseConnection, this.logger);

    // Initialize changelog service
    this.changelog = new ChangelogService(
      config.databaseConnection,
      this.logger
    );

    // Initialize activity logger
    this.activity = new ActivityLogger(config.databaseConnection, this.logger);

    // Initialize backup service
    this.backup = new BackupService(config.databaseConnection, this.logger);

    // Set backup service in admin service
    this.admin.setBackupService(this.backup);

    // Initialize metadata manager
    this.metadata = new MetadataManager(config.databaseConnection, this.logger);

    // Initialize performance monitor
    this.performance = new PerformanceMonitor(
      config.databaseConnection,
      this.logger
    );
  }

  // Database health management methods
  async performHealthCheck() {
    return this.database.healthCheck();
  }

  // Project activity methods
  async getProjectActivity(
    projectId: string,
    options?: { limit?: number; days?: number }
  ) {
    return await this.changelog.getByEntity("project", projectId, options);
  }

  async autoFixDatabase() {
    return this.autoFixer.autoFixAll([]);
  }

  async validateSchema() {
    return this.database.validateSchema();
  }

  async migrate() {
    return this.database.migrate();
  }

  // Collections management methods
  async createCollection(
    projectId: string,
    name: string,
    schema: {
      description?: string;
      fields: Array<{
        name: string;
        type: string;
        required?: boolean;
        unique?: boolean;
        default?: unknown;
        validation?: Record<string, unknown>;
      }>;
      indexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
    },
    createdBy?: string
  ) {
    return this.collections.schemaManager.createCollection(
      {
        name,
        project_id: projectId,
        ...(schema.description && { description: schema.description }),
        fields: schema.fields.map((f) => ({
          name: f.name,
          type: f.type as FieldType,
          required: f.required ?? false,
          unique: f.unique ?? false,
          indexed: false,
          default: f.default,
          ...(f.validation && {
            validation: f.validation as Record<string, unknown>,
          }),
        })),
        ...(schema.indexes && { indexes: schema.indexes }),
      },
      createdBy
    );
  }

  async getCollection(projectId: string, name: string) {
    const collections = await this.collections.schemaManager.getCollections();
    return (
      collections.find((c) => c.project_id === projectId && c.name === name) ||
      null
    );
  }

  async updateCollection(
    projectId: string,
    name: string,
    updates: {
      description?: string;
      fields?: Array<{
        name: string;
        type: string;
        required?: boolean;
        unique?: boolean;
        default?: unknown;
        validation?: Record<string, unknown>;
      }>;
      indexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
    }
  ) {
    const collection = await this.getCollection(projectId, name);
    if (!collection) {
      throw new Error("Collection not found");
    }

    return this.collections.schemaManager.updateCollection(collection.id, {
      ...(updates.description && { description: updates.description }),
      ...(updates.fields && {
        fields: updates.fields.map((f) => ({
          name: f.name,
          type: f.type as FieldType,
          required: f.required ?? false,
          unique: f.unique ?? false,
          indexed: false,
          default: f.default,
          ...(f.validation && {
            validation: f.validation as Record<string, unknown>,
          }),
        })),
      }),
      ...(updates.indexes && { indexes: updates.indexes }),
    });
  }

  async deleteCollection(projectId: string, name: string) {
    const collection = await this.getCollection(projectId, name);
    if (!collection) {
      return false;
    }

    return this.collections.schemaManager.deleteCollection(collection.id);
  }

  async getProjectCollections(projectId: string) {
    const collections = await this.collections.schemaManager.getCollections();
    return collections.filter((c) => c.project_id === projectId);
  }

  async getProjectStatistics(projectId: string) {
    return this.projects.getProjectStatistics(projectId);
  }

  // Document management methods - these will need to be implemented in CollectionsService
  async createDocument(
    projectId: string,
    collectionName: string,
    data: Record<string, unknown>
  ) {
    // Create document using CollectionsService
    return this.collections.service.createDocument(projectId, collectionName, {
      data,
      created_by: this.config.currentUserId || "system", // Use current user ID or fallback to system
    });
  }

  async createDocuments(
    projectId: string,
    collectionName: string,
    documents: CreateDocumentRequest[]
  ) {
    // Create multiple documents using CollectionsService
    // Documents are already in the correct format, just pass them through
    return this.collections.service.createDocuments(
      projectId,
      collectionName,
      documents
    );
  }

  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ) {
    // Get document using CollectionsService
    return this.collections.service.getDocumentById(
      projectId,
      collectionName,
      documentId
    );
  }

  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    data: Record<string, unknown>
  ) {
    // Update document using CollectionsService
    return this.collections.service.updateDocument(
      projectId,
      collectionName,
      documentId,
      {
        data,
        updated_by: this.config.currentUserId || "system", // Use current user ID or fallback to system
      }
    );
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ) {
    // Delete document using CollectionsService
    return this.collections.service.deleteDocument(
      projectId,
      collectionName,
      documentId
    );
  }

  async getDocuments(
    projectId: string,
    collectionName: string,
    filter?: {
      field_filters?: Record<string, unknown>;
      search?: string;
    },
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: "asc" | "desc";
    }
  ) {
    // Convert options to CollectionsService format
    const queryOptions: DocumentQueryOptions = {
      limit: options?.limit,
      offset: options?.offset,
      sort_by: options?.orderBy,
      sort_order: options?.order,
    };

    // Get documents using CollectionsService
    return this.collections.service.getDocuments(
      projectId,
      collectionName,
      filter,
      queryOptions
    );
  }

  async countDocuments(
    projectId: string,
    collectionName: string,
    filter?: {
      where?: Record<string, unknown>;
      search?: string;
    }
  ) {
    // Convert options to CollectionsService format
    const documentFilter = filter?.where
      ? { field_filters: filter.where }
      : filter?.search
      ? { search: filter.search }
      : undefined;

    // Get document count using CollectionsService
    return this.collections.service.countDocuments(
      projectId,
      collectionName,
      documentFilter
    );
  }

  async updateDocuments(
    projectId: string,
    collectionName: string,
    updates: Array<{
      id: string;
      data: Record<string, unknown>;
    }>
  ) {
    // Update documents using CollectionsService
    return this.collections.service.updateDocuments(
      projectId,
      collectionName,
      updates
    );
  }

  async deleteDocuments(
    projectId: string,
    collectionName: string,
    documentIds: string[]
  ): Promise<{
    success: boolean;
    results: boolean[];
    deleted_count: number;
    errors: string[];
  }> {
    const results = await this.collections.service.deleteDocuments(
      projectId,
      collectionName,
      documentIds
    );

    const deletedCount = results.filter((result) => result === true).length;
    const errors = results
      .map((result, index) => (result === false ? documentIds[index] : null))
      .filter((id) => id !== null) as string[];

    return {
      success: deletedCount > 0, // Success if at least one document was deleted
      results,
      deleted_count: deletedCount,
      errors,
    };
  }

  async searchDocuments(
    projectId: string,
    collectionName: string,
    query: {
      text?: string;
      fields?: string[];
      filters?: Record<string, unknown>;
      limit?: number;
      offset?: number;
    }
  ): Promise<Document[]> {
    return this.collections.service.searchDocuments(
      projectId,
      collectionName,
      query.text || "",
      {
        limit: query.limit,
        offset: query.offset,
      }
    );
  }

  async aggregateDocuments(
    projectId: string,
    collectionName: string,
    pipeline: Array<Record<string, unknown>>
  ): Promise<Array<Record<string, unknown>>> {
    return this.collections.service.aggregateDocuments(
      projectId,
      collectionName,
      pipeline
    );
  }

  // Type management methods
  async generateTypes(projectId: string) {
    // Get project collections and generate types
    const collections = await this.getProjectCollections(projectId);
    if (collections.length === 0) {
      throw new Error(`No collections found for project "${projectId}"`);
    }

    // Generate comprehensive TypeScript types for all collections
    const typeDefinitions = await Promise.all(
      collections.map(async (collection) => {
        const collectionData =
          await this.collections.schemaManager.getCollection(collection.id);
        if (!collectionData) {
          return {
            collectionId: collection.id,
            collectionName: collection.name,
            fields: collection.fields,
            typescriptTypes: "// Collection not found",
            message: "Collection not found",
          };
        }

        // Convert Collection to CollectionTypeDefinition format
        const typeDefinition =
          this.convertCollectionToTypeDefinition(collectionData);
        const types =
          await this.collections.typeManager.generateTypeScriptTypes(
            typeDefinition
          );

        return {
          collectionId: collection.id,
          collectionName: collection.name,
          fields: collection.fields,
          typescriptTypes: types,
          message: "Type generation completed successfully",
        };
      })
    );

    return typeDefinitions;
  }

  async validateTypes(projectId: string) {
    // Get project collections and validate types
    const collections = await this.getProjectCollections(projectId);
    if (collections.length === 0) {
      throw new Error(`No collections found for project "${projectId}"`);
    }

    // Validate types for all collections using the type validator
    const validationResults = await Promise.all(
      collections.map(async (collection) => {
        const collectionData =
          await this.collections.schemaManager.getCollection(collection.id);
        if (!collectionData) {
          return {
            collectionId: collection.id,
            collectionName: collection.name,
            isValid: false,
            issues: ["Collection not found"],
            suggestions: ["Check collection ID"],
            message: "Collection not found",
          };
        }

        // Convert Collection to CollectionTypeDefinition format
        const typeDefinition =
          this.convertCollectionToTypeDefinition(collectionData);
        const validation =
          await this.collections.typeValidator.validateCollectionTypes(
            typeDefinition
          );

        return {
          collectionId: collection.id,
          collectionName: collection.name,
          isValid: validation.isValid,
          issues: validation.issues,
          suggestions: validation.suggestions,
          message: validation.isValid
            ? "Type validation passed"
            : "Type validation failed",
        };
      })
    );

    return validationResults;
  }

  // Schema inspection methods
  async inspectSchema(projectId: string) {
    // Get project collections and inspect their schemas
    const collections = await this.getProjectCollections(projectId);
    if (collections.length === 0) {
      throw new Error(`No collections found for project "${projectId}"`);
    }

    // Inspect schemas for all collections in the project
    const inspections = await Promise.all(
      collections.map(async (collection) => {
        return this.collections.schemaInspector.getTableSchema(collection.name);
      })
    );

    return inspections;
  }

  async getTableInfo(projectId: string, tableName: string) {
    // Get table info using the schema inspector
    return this.collections.schemaInspector.getTableSchema(tableName);
  }

  // System methods
  async getSystemInfo() {
    return this.system.getSystemInfo();
  }

  async getSystemStatus() {
    // This would need to be implemented in SystemService
    throw new Error("System status not yet implemented in SystemService");
  }

  // Close the SDK and clean up resources
  async close() {
    try {
      if (this.config.databaseConnection.end) {
        await this.config.databaseConnection.end();
      }
      this.logger.info("BackendSDK closed successfully");
    } catch (error) {
      this.logger.error("Error closing BackendSDK:", error);
    }
  }

  /**
   * Convert Collection to CollectionTypeDefinition format
   */
  private convertCollectionToTypeDefinition(
    collection: Collection
  ): CollectionTypeDefinition {
    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      version: "1.0.0",
      schema: {
        fields: collection.schema.fields.map((field) => ({
          name: field.name,
          type: field.type,
          required: field.required,
          unique: field.unique,
          indexed: field.indexed || false,
          default: field.default_value,
          description: field.description,
          validation: field.validation,
          length: field.length,
          precision: field.precision,
          scale: field.scale,
          nullable: field.nullable,
          primary: field.primary,
          postgresql_type: field.type,
          typescript_type: field.type,
          relation: field.relation,
        })),
        indexes: (collection.schema.indexes || []).map((index) => ({
          name: index.name,
          fields: index.fields,
          unique: index.unique || false,
          type: "btree" as const,
        })),
        constraints: [],
        relations: [],
      },
      validation_rules: [],
      auto_fix_rules: [],
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      created_by: "system",
      project_id: collection.project_id,
      fields: collection.schema.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        unique: field.unique,
        indexed: field.indexed || false,
        default: field.default_value,
        description: field.description,
        validation: field.validation,
        length: field.length,
        precision: field.precision,
        scale: field.scale,
        nullable: field.nullable,
        primary: field.primary,
        postgresql_type: field.type,
        typescript_type: field.type,
        relation: field.relation,
      })),
      indexes: (collection.schema.indexes || []).map((index) => ({
        name: index.name,
        fields: index.fields,
        unique: index.unique || false,
        type: "btree" as const,
      })),
      constraints: [],
      relations: [],
      metadata: collection.metadata,
    };
  }
}
