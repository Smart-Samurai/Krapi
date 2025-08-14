/**
 * KRAPI Backend SDK
 *
 * Backend SDK for direct database access and backend operations.
 * This provides real functionality for database health, schema management,
 * collections operations, and auto-fixing capabilities.
 */

import { AdminService } from "./admin-service";
import { AuthService } from "./auth-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { CollectionsService } from "./collections-service";
import { CollectionsTypeManager } from "./collections-type-manager";
import { CollectionsTypeValidator } from "./collections-type-validator";
import { Logger, DatabaseSDKConfig } from "./core";
import { DatabaseHealthManager } from "./database-health";
import { EmailService } from "./email-service";
import { HealthService } from "./health-service";
import { PostgreSQLAutoFixer } from "./postgresql-auto-fixer";
import { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
import { ProjectsService } from "./projects-service";
import { SchemaGenerator } from "./schema-generator";
import { StorageService } from "./storage-service";
import { SystemService } from "./system-service";
import { TestingService } from "./testing-service";
import { FieldType } from "./types";
import { UsersService } from "./users-service";

export interface BackendSDKConfig extends DatabaseSDKConfig {}

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
    schemaInspector: PostgreSQLSchemaInspector;
  };
  public admin: AdminService;
  public auth: AuthService;
  public email: EmailService;
  public health: HealthService;
  public projects: ProjectsService;
  public storage: StorageService;
  public users: UsersService;
  public testing: TestingService;

  private config: BackendSDKConfig;
  private logger: Logger;

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
      schemaInspector: new PostgreSQLSchemaInspector(
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
  }

  // Database health management methods
  async performHealthCheck() {
    return this.database.healthCheck();
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
    _projectId: string,
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
    }
  ) {
    return this.collections.schemaManager.createCollection({
      name,
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
    });
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

  // Document management methods - these will need to be implemented in CollectionsService
  async createDocument(
    _projectId: string,
    _collectionName: string,
    _data: Record<string, unknown>
  ) {
    // This would need to be implemented in CollectionsService
    throw new Error(
      "Document operations not yet implemented in CollectionsService"
    );
  }

  async getDocument(
    _projectId: string,
    _collectionName: string,
    _documentId: string
  ) {
    // This would need to be implemented in CollectionsService
    throw new Error(
      "Document operations not yet implemented in CollectionsService"
    );
  }

  async updateDocument(
    _projectId: string,
    _collectionName: string,
    _documentId: string,
    _data: Record<string, unknown>
  ) {
    // This would need to be implemented in CollectionsService
    throw new Error(
      "Document operations not yet implemented in CollectionsService"
    );
  }

  async deleteDocument(
    _projectId: string,
    _collectionName: string,
    _documentId: string
  ) {
    // This would need to be implemented in CollectionsService
    throw new Error(
      "Document operations not yet implemented in CollectionsService"
    );
  }

  async getDocuments(
    _projectId: string,
    _collectionName: string,
    _options?: {
      limit?: number;
      offset?: number;
      where?: Record<string, unknown>;
      orderBy?: string;
      order?: "asc" | "desc";
    }
  ) {
    // This would need to be implemented in CollectionsService
    throw new Error(
      "Document operations not yet implemented in CollectionsService"
    );
  }

  // Type management methods
  async generateTypes(_projectId: string) {
    // This would need to be implemented in CollectionsTypeManager
    throw new Error(
      "Type generation not yet implemented in CollectionsTypeManager"
    );
  }

  async validateTypes(_projectId: string) {
    // This would need to be implemented in CollectionsTypeValidator
    throw new Error(
      "Type validation not yet implemented in CollectionsTypeValidator"
    );
  }

  // Schema inspection methods
  async inspectSchema(_projectId: string) {
    // This would need to be implemented in PostgreSQLSchemaInspector
    throw new Error(
      "Schema inspection not yet implemented in PostgreSQLSchemaInspector"
    );
  }

  async getTableInfo(_projectId: string, _tableName: string) {
    // This would need to be implemented in PostgreSQLSchemaInspector
    throw new Error(
      "Table info not yet implemented in PostgreSQLSchemaInspector"
    );
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
}
