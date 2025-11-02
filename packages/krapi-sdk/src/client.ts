/**
 * KRAPI Client SDK
 * 
 * Easy-to-import client SDK for React, Vue, Angular, and other frontend frameworks.
 * Similar to Appwrite SDK - just import and use!
 * 
 * @example
 * ```typescript
 * import { KrapiClient } from '@krapi/sdk/client';
 * 
 * const krapi = new KrapiClient({
 *   endpoint: 'http://localhost:3470',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Use it!
 * const projects = await krapi.projects.list();
 * const documents = await krapi.collections.documents.list('project-id', 'collection-name');
 * ```
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { AuthHttpClient } from "./http-clients/auth-http-client";
import { ProjectsHttpClient } from "./http-clients/projects-http-client";
import { CollectionsHttpClient } from "./http-clients/collections-http-client";
import { StorageHttpClient } from "./http-clients/storage-http-client";
import { AdminHttpClient } from "./http-clients/admin-http-client";
import { EmailHttpClient } from "./http-clients/email-http-client";
import { HealthHttpClient } from "./http-clients/health-http-client";
import { BaseHttpClient } from "./http-clients/base-http-client";
import { BackupService } from "./backup-service";
import { DatabaseConnection } from "./core";

export interface KrapiClientConfig {
  endpoint: string;
  apiKey?: string;
  sessionToken?: string;
  projectId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * KRAPI Client SDK
 * 
 * Simple, unified client for interacting with KRAPI backend.
 * Works exactly like Appwrite SDK - import and use!
 */
export class KrapiClient {
  private config: KrapiClientConfig;
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  // Service clients
  public auth: AuthHttpClient;
  public projects: ProjectsHttpClient;
  public collections: {
    documents: {
      list: (projectId: string, collectionName: string, options?: {
        limit?: number;
        offset?: number;
        filter?: Record<string, unknown>;
        sort?: Record<string, "asc" | "desc">;
      }) => Promise<ApiResponse<unknown[]>>;
      get: (projectId: string, collectionName: string, documentId: string) => Promise<ApiResponse<unknown>>;
      create: (projectId: string, collectionName: string, data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
      update: (projectId: string, collectionName: string, documentId: string, data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
      delete: (projectId: string, collectionName: string, documentId: string) => Promise<ApiResponse<{ success: boolean }>>;
      bulkCreate: (projectId: string, collectionName: string, documents: Record<string, unknown>[]) => Promise<ApiResponse<{ created: unknown[]; errors: Array<{ index: number; error: string }> }>>;
      bulkUpdate: (projectId: string, collectionName: string, filter: Record<string, unknown>, updates: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
      bulkDelete: (projectId: string, collectionName: string, filter: Record<string, unknown>) => Promise<ApiResponse<{ success: boolean }>>;
      search: (projectId: string, collectionName: string, query: string, options?: {
        fields?: string[];
        limit?: number;
      }) => Promise<ApiResponse<unknown[]>>;
      aggregate: (projectId: string, collectionName: string, options: {
        groupBy?: string;
        operations: Array<{ field: string; operation: string }>;
      }) => Promise<ApiResponse<{ groups: Record<string, Record<string, number>>; total_groups: number }>>;
    };
    list: (projectId: string) => Promise<ApiResponse<unknown[]>>;
    get: (projectId: string, collectionName: string) => Promise<ApiResponse<unknown>>;
    create: (projectId: string, collectionData: {
      name: string;
      description?: string;
      fields: Array<{
        name: string;
        type: string;
        required?: boolean;
        default?: unknown;
      }>;
      indexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
    }) => Promise<ApiResponse<unknown>>;
    update: (projectId: string, collectionName: string, updates: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
    delete: (projectId: string, collectionName: string) => Promise<ApiResponse<{ success: boolean }>>;
  };
  public storage: StorageHttpClient;
  public admin: AdminHttpClient;
  public email: EmailHttpClient;
  public health: HealthHttpClient;
  public backup: {
    createProject: (projectId: string, options?: {
      description?: string;
      password?: string;
    }) => Promise<ApiResponse<{ backup_id: string; password: string; created_at: string; size: number }>>;
    restoreProject: (projectId: string, backupId: string, password: string, options?: {
      overwrite?: boolean;
    }) => Promise<ApiResponse<{ success: boolean }>>;
    list: (projectId?: string, type?: "project" | "system") => Promise<ApiResponse<unknown[]>>;
    delete: (backupId: string) => Promise<ApiResponse<{ success: boolean }>>;
    createSystem: (options?: {
      description?: string;
      password?: string;
    }) => Promise<ApiResponse<{ backup_id: string; password: string; created_at: string; size: number }>>;
  };

  constructor(config: KrapiClientConfig) {
    this.config = config;
    this.baseUrl = config.endpoint.replace(/\/$/, ""); // Remove trailing slash

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    });

    // Set auth headers
    if (config.apiKey) {
      this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${config.apiKey}`;
    }
    if (config.sessionToken) {
      this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${config.sessionToken}`;
    }
    if (config.projectId) {
      this.axiosInstance.defaults.headers.common["X-Project-ID"] = config.projectId;
    }

    // Initialize service clients (BaseHttpClient takes one config object)
    const httpConfig = {
      baseUrl: this.baseUrl,
      apiKey: this.config.apiKey,
      sessionToken: this.config.sessionToken,
      timeout: this.config.timeout,
    };
    
    this.auth = new AuthHttpClient(httpConfig);
    this.projects = new ProjectsHttpClient(httpConfig);
    this.storage = new StorageHttpClient(httpConfig);
    this.admin = new AdminHttpClient(httpConfig);
    this.email = new EmailHttpClient(httpConfig);
    this.health = new HealthHttpClient(httpConfig);

    // Initialize collections client
    const collectionsClient = new CollectionsHttpClient(httpConfig);
    
    // Wrap collections client methods to match expected interface
    this.collections = {
      documents: {
        list: async (projectId, collectionName, options) => {
          // CollectionsHttpClient uses getProjectCollections which returns collections, not documents
          // We need to use the documents endpoint directly
          const url = `/projects/${projectId}/collections/${collectionName}/documents`;
          const params = new URLSearchParams();
          if (options?.limit) params.append('limit', options.limit.toString());
          if (options?.offset) params.append('offset', options.offset.toString());
          if (options?.filter) params.append('filter', JSON.stringify(options.filter));
          if (options?.sort) params.append('sort', JSON.stringify(options.sort));
          const response = await this.axiosInstance.get<ApiResponse<unknown[]>>(
            `/krapi/k1${url}${params.toString() ? `?${params.toString()}` : ''}`
          );
          return response.data;
        },
        get: async (projectId, collectionName, documentId) => {
          return collectionsClient.getDocument(projectId, collectionName, documentId);
        },
        create: async (projectId, collectionName, data) => {
          // Use the createDocument method that takes projectId, collectionName, CreateDocumentRequest
          const response = await this.axiosInstance.post<ApiResponse<unknown>>(
            `/krapi/k1/projects/${projectId}/collections/${collectionName}/documents`,
            { data, created_by: 'client' }
          );
          return response.data;
        },
        update: async (projectId, collectionName, documentId, data) => {
          return collectionsClient.updateDocument(projectId, collectionName, documentId, { data, updated_by: 'client' });
        },
        delete: async (projectId, collectionName, documentId) => {
          return collectionsClient.deleteDocument(projectId, collectionName, documentId);
        },
        bulkCreate: async (projectId, collectionName, documents) => {
          // Convert array to CreateDocumentRequest[]
          const createRequests = documents.map(doc => ({ data: doc, created_by: 'client' }));
          return collectionsClient.bulkCreateDocuments(projectId, collectionName, createRequests);
        },
        bulkUpdate: async (projectId, collectionName, filter, updates) => {
          // For bulk update with filter, we need to use a different endpoint
          // This is a simplified version - may need to adjust based on actual API
          const response = await this.axiosInstance.put<ApiResponse<unknown>>(
            `/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/bulk`,
            { filter, updates }
          );
          return response.data;
        },
        bulkDelete: async (projectId, collectionName, filter) => {
          // For bulk delete with filter, we need to fetch IDs first or use a filter endpoint
          // This is a simplified version - may need to adjust based on actual API
          const response = await this.axiosInstance.post<ApiResponse<{ success: boolean }>>(
            `/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/bulk-delete`,
            { filter }
          );
          return response.data;
        },
        search: async (projectId, collectionName, query, options) => {
          return collectionsClient.searchDocuments(projectId, collectionName, {
            text: query,
            fields: options?.fields,
            limit: options?.limit,
          });
        },
        aggregate: async (projectId, collectionName, options) => {
          const aggregations: Record<string, { type: 'count' | 'sum' | 'avg' | 'min' | 'max'; field?: string }> = {};
          if (options.operations) {
            for (const op of options.operations) {
              const opType = op.operation as 'count' | 'sum' | 'avg' | 'min' | 'max';
              if (['count', 'sum', 'avg', 'min', 'max'].includes(op.operation)) {
                aggregations[op.field] = { type: opType, field: op.field };
              }
            }
          }
          return collectionsClient.aggregateDocuments(projectId, collectionName, {
            group_by: options.groupBy ? [options.groupBy] : undefined,
            aggregations,
          });
        },
      },
      list: async (projectId) => {
        const result = await collectionsClient.getProjectCollections(projectId);
        return {
          success: true,
          data: result.data || [],
        } as ApiResponse<unknown[]>;
      },
      get: async (projectId, collectionName) => {
        return collectionsClient.getCollection(projectId, collectionName);
      },
      create: async (projectId, collectionData) => {
        return collectionsClient.createCollection(projectId, collectionData);
      },
      update: async (projectId, collectionName, updates) => {
        return collectionsClient.updateCollection(projectId, collectionName, updates);
      },
      delete: async (projectId, collectionName) => {
        return collectionsClient.deleteCollection(projectId, collectionName);
      },
    };

    // Initialize backup client (using HTTP calls)
    this.backup = {
      createProject: async (projectId, options) => {
        const response = await this.axiosInstance.post<ApiResponse<{
          backup_id: string;
          password: string;
          created_at: string;
          size: number;
        }>>(`/krapi/k1/projects/${projectId}/backup`, options || {});
        return response.data;
      },
      restoreProject: async (projectId, backupId, password, options) => {
        const response = await this.axiosInstance.post<ApiResponse<{ success: boolean }>>(
          `/krapi/k1/projects/${projectId}/restore`,
          { backup_id: backupId, password, ...options }
        );
        return response.data;
      },
      list: async (projectId, type) => {
        const url = projectId
          ? `/krapi/k1/projects/${projectId}/backups${type ? `?type=${type}` : ""}`
          : `/krapi/k1/backups${type ? `?type=${type}` : ""}`;
        const response = await this.axiosInstance.get<ApiResponse<unknown[]>>(url);
        return response.data;
      },
      delete: async (backupId) => {
        const response = await this.axiosInstance.delete<ApiResponse<{ success: boolean }>>(
          `/krapi/k1/backups/${backupId}`
        );
        return response.data;
      },
      createSystem: async (options) => {
        const response = await this.axiosInstance.post<ApiResponse<{
          backup_id: string;
          password: string;
          created_at: string;
          size: number;
        }>>("/krapi/k1/backup/system", options || {});
        return response.data;
      },
    };
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
  }

  /**
   * Set session token for authentication
   */
  setSessionToken(token: string): void {
    this.config.sessionToken = token;
    this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Set project ID for project-specific operations
   */
  setProjectId(projectId: string): void {
    this.config.projectId = projectId;
    this.axiosInstance.defaults.headers.common["X-Project-ID"] = projectId;
  }

  /**
   * Get current configuration
   */
  getConfig(): KrapiClientConfig {
    return { ...this.config };
  }
}

// Default export for easy importing
export default KrapiClient;
