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

  /**
   * Perform database health check
   * 
   * Runs comprehensive health checks on the database including schema validation,
   * connection status, and data integrity checks.
   * 
   * @returns {Promise<Record<string, unknown>>} Health check results
   * 
   * @example
   * const health = await sdk.performHealthCheck();
   * console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
   */
  async performHealthCheck() {
    return this.database.healthCheck();
  }

  /**
   * Get project activity logs
   * 
   * Retrieves activity logs for a specific project including changes to collections,
   * documents, and other project entities.
   * 
   * @param {string} projectId - Project ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of logs to return
   * @param {number} [options.days] - Number of days to look back
   * @returns {Promise<unknown[]>} Array of activity log entries
   * 
   * @example
   * const activity = await sdk.getProjectActivity('project-id', { limit: 50, days: 7 });
   */
  async getProjectActivity(
    projectId: string,
    options?: { limit?: number; days?: number }
  ) {
    return await this.changelog.getByEntity("project", projectId, options);
  }

  /**
   * Automatically fix database schema issues
   * 
   * Runs auto-fixer to detect and fix schema misalignments, missing fields,
   * type mismatches, and other database health issues.
   * 
   * @returns {Promise<Record<string, unknown>>} Auto-fix results
   * 
   * @example
   * const results = await sdk.autoFixDatabase();
   * console.log(results.fixed); // Number of issues fixed
   */
  async autoFixDatabase() {
    return this.autoFixer.autoFixAll([]);
  }

  /**
   * Validate database schema
   * 
   * Validates the current database schema against expected schema definitions.
   * 
   * @returns {Promise<Record<string, unknown>>} Validation results
   * 
   * @example
   * const validation = await sdk.validateSchema();
   * if (!validation.valid) {
   *   console.log(validation.errors);
   * }
   */
  async validateSchema() {
    return this.database.validateSchema();
  }

  /**
   * Run database migrations
   * 
   * Executes pending database migrations to update schema to latest version.
   * 
   * @returns {Promise<Record<string, unknown>>} Migration results
   * 
   * @example
   * const results = await sdk.migrate();
   * console.log(results.applied); // Number of migrations applied
   */
  async migrate() {
    return this.database.migrate();
  }

  /**
   * Create a new collection
   * 
   * Creates a new collection with the specified schema, fields, and indexes.
   * 
   * @param {string} projectId - Project ID
   * @param {string} name - Collection name
   * @param {Object} schema - Collection schema definition
   * @param {string} [schema.description] - Collection description
   * @param {Array} schema.fields - Collection fields
   * @param {string} schema.fields[].name - Field name
   * @param {string} schema.fields[].type - Field type
   * @param {boolean} [schema.fields[].required] - Whether field is required
   * @param {boolean} [schema.fields[].unique] - Whether field is unique
   * @param {unknown} [schema.fields[].default] - Default value
   * @param {Record<string, unknown>} [schema.fields[].validation] - Validation rules
   * @param {Array} [schema.indexes] - Collection indexes
   * @param {string} schema.indexes[].name - Index name
   * @param {string[]} schema.indexes[].fields - Index fields
   * @param {boolean} [schema.indexes[].unique] - Whether index is unique
   * @param {string} [createdBy] - User ID who created the collection
   * @returns {Promise<Collection>} Created collection
   * 
   * @example
   * const collection = await sdk.createCollection('project-id', 'tasks', {
   *   description: 'Task management',
   *   fields: [
   *     { name: 'title', type: 'string', required: true },
   *     { name: 'status', type: 'string', default: 'pending' }
   *   ],
   *   indexes: [{ name: 'idx_title', fields: ['title'] }]
   * });
   */
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

  /**
   * Get a collection by name
   * 
   * Retrieves a collection by project ID and collection name.
   * 
   * @param {string} projectId - Project ID
   * @param {string} name - Collection name
   * @returns {Promise<Collection | null>} Collection or null if not found
   * 
   * @example
   * const collection = await sdk.getCollection('project-id', 'tasks');
   */
  async getCollection(projectId: string, name: string) {
    const collections = await this.collections.schemaManager.getCollections();
    return (
      collections.find((c) => c.project_id === projectId && c.name === name) ||
      null
    );
  }

  /**
   * Update a collection schema
   * 
   * Updates collection description, fields, or indexes.
   * 
   * @param {string} projectId - Project ID
   * @param {string} name - Collection name
   * @param {Object} updates - Update data
   * @param {string} [updates.description] - New description
   * @param {Array} [updates.fields] - Updated fields
   * @param {Array} [updates.indexes] - Updated indexes
   * @returns {Promise<Collection>} Updated collection
   * @throws {Error} If collection not found
   * 
   * @example
   * const updated = await sdk.updateCollection('project-id', 'tasks', {
   *   description: 'Updated description',
   *   fields: [{ name: 'priority', type: 'string' }]
   * });
   */
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

  /**
   * Delete a collection
   * 
   * Deletes a collection and all its documents. This operation is irreversible.
   * 
   * @param {string} projectId - Project ID
   * @param {string} name - Collection name
   * @returns {Promise<boolean>} True if deleted, false if not found
   * 
   * @example
   * const deleted = await sdk.deleteCollection('project-id', 'tasks');
   */
  async deleteCollection(projectId: string, name: string) {
    const collection = await this.getCollection(projectId, name);
    if (!collection) {
      return false;
    }

    return this.collections.schemaManager.deleteCollection(collection.id);
  }

  /**
   * Get all collections for a project
   * 
   * Retrieves all collections belonging to a specific project.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Collection[]>} Array of collections
   * 
   * @example
   * const collections = await sdk.getProjectCollections('project-id');
   */
  async getProjectCollections(projectId: string) {
    const collections = await this.collections.schemaManager.getCollections();
    return collections.filter((c) => c.project_id === projectId);
  }

  /**
   * Get project statistics
   * 
   * Retrieves comprehensive statistics for a project including collection counts,
   * document counts, storage usage, and activity metrics.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<ProjectStats>} Project statistics
   * 
   * @example
   * const stats = await sdk.getProjectStatistics('project-id');
   * console.log(stats.collection_count, stats.document_count);
   */
  async getProjectStatistics(projectId: string) {
    return this.projects.getProjectStatistics(projectId);
  }

  /**
   * Create a document in a collection
   * 
   * Creates a new document with the provided data in the specified collection.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Record<string, unknown>} data - Document data
   * @returns {Promise<Document>} Created document
   * 
   * @example
   * const doc = await sdk.createDocument('project-id', 'tasks', {
   *   title: 'New Task',
   *   status: 'pending'
   * });
   */
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

  /**
   * Create multiple documents in a collection
   * 
   * Creates multiple documents in a single operation for better performance.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {CreateDocumentRequest[]} documents - Array of document data
   * @returns {Promise<Document[]>} Array of created documents
   * 
   * @example
   * const docs = await sdk.createDocuments('project-id', 'tasks', [
   *   { data: { title: 'Task 1' } },
   *   { data: { title: 'Task 2' } }
   * ]);
   */
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

  /**
   * Get a document by ID
   * 
   * Retrieves a specific document from a collection by its ID.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {string} documentId - Document ID
   * @returns {Promise<Document | null>} Document or null if not found
   * 
   * @example
   * const doc = await sdk.getDocument('project-id', 'tasks', 'doc-id');
   */
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

  /**
   * Update a document
   * 
   * Updates an existing document with new data.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {string} documentId - Document ID
   * @param {Record<string, unknown>} data - Updated data
   * @returns {Promise<Document>} Updated document
   * 
   * @example
   * const updated = await sdk.updateDocument('project-id', 'tasks', 'doc-id', {
   *   status: 'completed'
   * });
   */
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

  /**
   * Delete a document
   * 
   * Deletes a document from a collection. This operation is irreversible.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {string} documentId - Document ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   * 
   * @example
   * const deleted = await sdk.deleteDocument('project-id', 'tasks', 'doc-id');
   */
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

  /**
   * Get documents from a collection
   * 
   * Retrieves documents from a collection with optional filtering, pagination, and sorting.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Object} [filter] - Filter options
   * @param {Record<string, unknown>} [filter.field_filters] - Field-based filters
   * @param {string} [filter.search] - Search query
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of documents to return
   * @param {number} [options.offset] - Number of documents to skip
   * @param {string} [options.orderBy] - Field to sort by
   * @param {string} [options.order] - Sort order ('asc' | 'desc')
   * @returns {Promise<Document[]>} Array of documents
   * 
   * @example
   * const docs = await sdk.getDocuments('project-id', 'tasks', {
   *   field_filters: { status: 'pending' }
   * }, { limit: 10, offset: 0, orderBy: 'created_at', order: 'desc' });
   */
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

  /**
   * Count documents in a collection
   * 
   * Returns the total count of documents matching the specified filter.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Object} [filter] - Filter options
   * @param {Record<string, unknown>} [filter.where] - Field-based filters
   * @param {string} [filter.search] - Search query
   * @returns {Promise<number>} Document count
   * 
   * @example
   * const count = await sdk.countDocuments('project-id', 'tasks', {
   *   where: { status: 'pending' }
   * });
   */
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

  /**
   * Update multiple documents
   * 
   * Updates multiple documents in a single operation for better performance.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Array} updates - Array of document updates
   * @param {string} updates[].id - Document ID
   * @param {Record<string, unknown>} updates[].data - Updated data
   * @returns {Promise<Document[]>} Array of updated documents
   * 
   * @example
   * const updated = await sdk.updateDocuments('project-id', 'tasks', [
   *   { id: 'doc-1', data: { status: 'completed' } },
   *   { id: 'doc-2', data: { status: 'in-progress' } }
   * ]);
   */
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

  /**
   * Delete multiple documents
   * 
   * Deletes multiple documents in a single operation. Returns detailed results
   * including which documents were successfully deleted and any errors.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {string[]} documentIds - Array of document IDs to delete
   * @returns {Promise<Object>} Deletion results
   * @returns {boolean} returns.success - True if at least one document was deleted
   * @returns {boolean[]} returns.results - Array of deletion results per document
   * @returns {number} returns.deleted_count - Number of successfully deleted documents
   * @returns {string[]} returns.errors - Array of document IDs that failed to delete
   * 
   * @example
   * const result = await sdk.deleteDocuments('project-id', 'tasks', ['doc-1', 'doc-2']);
   * console.log(`Deleted ${result.deleted_count} documents`);
   */
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

  /**
   * Search documents in a collection
   * 
   * Performs full-text search on documents in a collection with optional field filtering.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Object} query - Search query
   * @param {string} [query.text] - Search text
   * @param {string[]} [query.fields] - Fields to search in
   * @param {Record<string, unknown>} [query.filters] - Additional filters
   * @param {number} [query.limit] - Maximum number of results
   * @param {number} [query.offset] - Number of results to skip
   * @returns {Promise<Document[]>} Array of matching documents
   * 
   * @example
   * const results = await sdk.searchDocuments('project-id', 'tasks', {
   *   text: 'urgent',
   *   fields: ['title', 'description'],
   *   limit: 20
   * });
   */
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

  /**
   * Aggregate documents using a pipeline
   * 
   * Performs aggregation operations on documents using a pipeline of operations.
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Array<Record<string, unknown>>} pipeline - Aggregation pipeline
   * @returns {Promise<Array<Record<string, unknown>>>} Aggregated results
   * 
   * @example
   * const results = await sdk.aggregateDocuments('project-id', 'tasks', [
   *   { $group: { _id: '$status', count: { $sum: 1 } } }
   * ]);
   */
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

  /**
   * Generate TypeScript types for project collections
   * 
   * Generates comprehensive TypeScript type definitions for all collections
   * in a project based on their schemas.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of type definitions for each collection
   * @throws {Error} If no collections found for project
   * 
   * @example
   * const types = await sdk.generateTypes('project-id');
   * types.forEach(t => console.log(t.typescriptTypes));
   */
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

  /**
   * Validate TypeScript types for project collections
   * 
   * Validates that all collections in a project have correct and consistent
   * type definitions, checking for type mismatches and inconsistencies.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of validation results for each collection
   * @throws {Error} If no collections found for project
   * 
   * @example
   * const results = await sdk.validateTypes('project-id');
   * results.forEach(r => {
   *   if (!r.isValid) console.log(r.issues);
   * });
   */
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

  /**
   * Inspect database schema for a project
   * 
   * Inspects and returns the actual database schema for all collections
   * in a project, showing the real structure as stored in the database.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of schema inspections for each collection
   * @throws {Error} If no collections found for project
   * 
   * @example
   * const schemas = await sdk.inspectSchema('project-id');
   * schemas.forEach(s => console.log(s.table_name, s.columns));
   */
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

  /**
   * Get table information
   * 
   * Retrieves detailed schema information for a specific table/collection.
   * 
   * @param {string} projectId - Project ID (unused, kept for API consistency)
   * @param {string} tableName - Table/collection name
   * @returns {Promise<Record<string, unknown>>} Table schema information
   * 
   * @example
   * const info = await sdk.getTableInfo('project-id', 'tasks');
   * console.log(info.columns, info.indexes);
   */
  async getTableInfo(projectId: string, tableName: string) {
    // Get table info using the schema inspector
    return this.collections.schemaInspector.getTableSchema(tableName);
  }

  /**
   * Get system information
   * 
   * Retrieves general system information including version, capabilities, and configuration.
   * 
   * @returns {Promise<Record<string, unknown>>} System information
   * 
   * @example
   * const info = await sdk.getSystemInfo();
   * console.log(info.version, info.features);
   */
  async getSystemInfo() {
    return this.system.getSystemInfo();
  }

  /**
   * Get system status
   * 
   * Retrieves current system status including health, uptime, and operational state.
   * 
   * @returns {Promise<Record<string, unknown>>} System status
   * @throws {Error} If not yet implemented
   * 
   * @example
   * const status = await sdk.getSystemStatus();
   * console.log(status.health, status.uptime);
   */
  async getSystemStatus() {
    // This would need to be implemented in SystemService
    throw new Error("System status not yet implemented in SystemService");
  }

  /**
   * Close the SDK and clean up resources
   * 
   * Closes database connections and cleans up all resources.
   * Should be called when the SDK is no longer needed.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await sdk.close();
   */
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
