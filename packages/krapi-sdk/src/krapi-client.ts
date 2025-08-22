/**
 * Unified KRAPI Client
 *
 * A unified client that can operate in two modes:
 * 1. Database Mode: Direct database access (for backend/server-side)
 * 2. HTTP Mode: API client for remote access (for frontend/external)
 */

import { AdminService } from "./admin-service";
import { AuthService } from "./auth-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { CollectionsService } from "./collections-service";
import { CollectionsTypeManager } from "./collections-type-manager";
import { CollectionsTypeValidator } from "./collections-type-validator";
import { Logger, DatabaseSDKConfig, HttpSDKConfig, BaseClient } from "./core";
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
import axios from "axios";

// Client mode type
export type ClientMode = "database" | "http";

export interface KrapiClientConfig {
  mode: ClientMode;
  database?: DatabaseSDKConfig;
  http?: HttpSDKConfig;
}

// Base service interface for mode switching (currently unused)
// interface ServiceProvider {
//   database?: DatabaseConnection;
//   httpClient?: any; // Will be axios instance for HTTP mode
//   logger: Logger;
// }

export class KrapiClient implements BaseClient {
  public readonly mode: ClientMode;

  // Database-specific services (only available in database mode)
  public database?: DatabaseHealthManager;
  public autoFixer?: PostgreSQLAutoFixer;
  public schemaGenerator?: SchemaGenerator;

  // Collections management
  public collections: {
    typeManager?: CollectionsTypeManager;
    typeValidator?: CollectionsTypeValidator;
    schemaManager?: CollectionsSchemaManager;
    service?: CollectionsService;
    schemaInspector?: PostgreSQLSchemaInspector;
  } = {};

  // Core services (available in both modes)
  public admin?: AdminService;
  public auth?: AuthService;
  public email?: EmailService;
  public health?: HealthService;
  public projects?: ProjectsService;
  public storage?: StorageService;
  public users?: UsersService;
  public system?: SystemService;
  public testing?: TestingService;

  private config: KrapiClientConfig;
  private logger: Logger;
  private httpClient?: any; // Axios instance for HTTP mode

  constructor(config: KrapiClientConfig) {
    this.config = config;
    this.mode = config.mode;

    // Initialize logger
    this.logger = config.database?.logger || config.http?.logger || console;

    if (config.mode === "database" && config.database) {
      this.initializeDatabaseMode(config.database);
    } else if (config.mode === "http" && config.http) {
      this.initializeHttpMode(config.http);
    } else {
      throw new Error(`Invalid configuration for mode: ${config.mode}`);
    }
  }

  private initializeDatabaseMode(dbConfig: DatabaseSDKConfig) {
    // Validate database connection
    if (
      !dbConfig.databaseConnection ||
      typeof dbConfig.databaseConnection.query !== "function"
    ) {
      throw new Error(
        "Database mode requires a valid database connection with query method"
      );
    }

    const db = dbConfig.databaseConnection;
    const logger = this.logger;

    // Initialize database-specific services
    this.database = new DatabaseHealthManager(db, logger as Console);
    this.autoFixer = new PostgreSQLAutoFixer(db, logger as Console);
    this.schemaGenerator = new SchemaGenerator(
      { databaseConnection: db },
      {
        defaultStringLength: 255,
        defaultDecimalPrecision: 10,
        defaultDecimalScale: 2,
        generateIndexes: true,
        generateConstraints: true,
        generateRelations: true,
      }
    );

    // Initialize collections management
    this.collections = {
      typeManager: new CollectionsTypeManager(db, logger as Console),
      typeValidator: new CollectionsTypeValidator(db, logger as Console),
      schemaManager: new CollectionsSchemaManager(db, logger as Console),
      service: new CollectionsService(db, logger as Console),
      schemaInspector: new PostgreSQLSchemaInspector(db, logger as Console),
    };

    // Initialize core services with database
    this.admin = new AdminService(db, logger);
    this.auth = new AuthService(db, logger);
    this.email = new EmailService(db, logger);
    this.health = new HealthService(db, logger);
    this.projects = new ProjectsService(db, logger);
    this.storage = new StorageService(db, logger);
    this.users = new UsersService(db, logger);
    this.system = new SystemService("", ""); // No HTTP needed in database mode
    this.testing = new TestingService(db, logger);
  }

  private async initializeHttpMode(httpConfig: HttpSDKConfig) {
    // Create axios instance
    this.httpClient = axios.create({
      baseURL: httpConfig.baseUrl,
      timeout: httpConfig.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use((config: any) => {
      if (httpConfig.sessionToken) {
        config.headers.Authorization = `Bearer ${httpConfig.sessionToken}`;
      } else if (httpConfig.apiKey) {
        config.headers["X-API-Key"] = httpConfig.apiKey;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        // Enhanced error handling
        if (error.response) {
          const { status, data } = error.response;
          const enhancedError = {
            ...error,
            message: data?.error || data?.message || error.message,
            status,
            isApiError: true,
            originalError: error,
          };
          return Promise.reject(enhancedError);
        }
        return Promise.reject(error);
      }
    );

    // TODO: Initialize HTTP-based services
    // These would make HTTP calls instead of direct database calls
    this.logger.info(
      "HTTP mode initialized, but HTTP services not yet implemented"
    );
  }

  // Database Mode Helper Methods
  async performHealthCheck() {
    if (this.mode !== "database" || !this.database) {
      throw new Error("Health check only available in database mode");
    }
    return this.database.healthCheck();
  }

  async autoFixDatabase() {
    if (this.mode !== "database" || !this.autoFixer) {
      throw new Error("Auto-fix only available in database mode");
    }
    return this.autoFixer.autoFixAll([]);
  }

  async validateSchema() {
    if (this.mode !== "database" || !this.database) {
      throw new Error("Schema validation only available in database mode");
    }
    return this.database.validateSchema();
  }

  async migrate() {
    if (this.mode !== "database" || !this.database) {
      throw new Error("Migration only available in database mode");
    }
    return this.database.migrate();
  }

  // Collections Management (Database Mode)
  async createCollection(
    _projectId: string, // Currently unused, will be used for project-scoped collections
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
    if (this.mode !== "database" || !this.collections.schemaManager) {
      throw new Error("Collection creation only available in database mode");
    }

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
    if (this.mode !== "database" || !this.collections.schemaManager) {
      throw new Error("Collection retrieval only available in database mode");
    }

    const collections = await this.collections.schemaManager.getCollections();
    return (
      collections.find((c) => c.project_id === projectId && c.name === name) ||
      null
    );
  }

  async getProjectCollections(projectId: string) {
    if (this.mode !== "database" || !this.collections.schemaManager) {
      throw new Error("Collection listing only available in database mode");
    }

    const collections = await this.collections.schemaManager.getCollections();
    return collections.filter((c) => c.project_id === projectId);
  }

  // Document Management (Database Mode)
  async createDocument(
    projectId: string,
    collectionName: string,
    documentData: { data: Record<string, unknown>; created_by?: string }
  ) {
    if (this.mode !== "database" || !this.collections.service) {
      throw new Error("Document creation only available in database mode");
    }
    return this.collections.service.createDocument(
      projectId,
      collectionName,
      documentData
    );
  }

  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ) {
    if (this.mode !== "database" || !this.collections.service) {
      throw new Error("Document retrieval only available in database mode");
    }
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
    updateData: { data: Record<string, unknown>; updated_by?: string }
  ) {
    if (this.mode !== "database" || !this.collections.service) {
      throw new Error("Document update only available in database mode");
    }
    return this.collections.service.updateDocument(
      projectId,
      collectionName,
      documentId,
      updateData
    );
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    deletedBy?: string
  ) {
    if (this.mode !== "database" || !this.collections.service) {
      throw new Error("Document deletion only available in database mode");
    }
    return this.collections.service.deleteDocument(
      projectId,
      collectionName,
      documentId,
      deletedBy
    );
  }

  async getDocuments(
    projectId: string,
    collectionName: string,
    filter?: Record<string, unknown>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: "asc" | "desc";
    }
  ) {
    if (this.mode !== "database" || !this.collections.service) {
      throw new Error("Document listing only available in database mode");
    }
    return this.collections.service.getDocuments(
      projectId,
      collectionName,
      filter,
      options
    );
  }

  // HTTP Mode Helper Methods
  setSessionToken(token: string) {
    if (this.mode !== "http") {
      throw new Error("Session tokens only available in HTTP mode");
    }
    // Update the http config and axios interceptor
    if (this.config.http) {
      this.config.http.sessionToken = token;
      delete this.config.http.apiKey;
    }
  }

  setApiKey(key: string) {
    if (this.mode !== "http") {
      throw new Error("API keys only available in HTTP mode");
    }
    // Update the http config and axios interceptor
    if (this.config.http) {
      this.config.http.apiKey = key;
      delete this.config.http.sessionToken;
    }
  }

  clearAuth() {
    if (this.mode !== "http") {
      throw new Error("Auth clearing only available in HTTP mode");
    }
    if (this.config.http) {
      delete this.config.http.sessionToken;
      delete this.config.http.apiKey;
    }
  }

  // System Methods
  async getSystemInfo() {
    if (this.system) {
      return this.system.getSystemInfo();
    }
    throw new Error("System service not available");
  }

  // Close and cleanup
  async close() {
    try {
      if (
        this.mode === "database" &&
        this.config.database?.databaseConnection.end
      ) {
        await this.config.database.databaseConnection.end();
      }
      this.logger.info("KrapiClient closed successfully");
    } catch (error) {
      this.logger.error("Error closing KrapiClient:", error);
    }
  }
}

// Convenience factory functions
export function createDatabaseClient(config: DatabaseSDKConfig): KrapiClient {
  return new KrapiClient({
    mode: "database",
    database: config,
  });
}

export function createHttpClient(config: HttpSDKConfig): KrapiClient {
  return new KrapiClient({
    mode: "http",
    http: config,
  });
}
