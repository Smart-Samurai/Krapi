/**
 * Collections HTTP Client for KRAPI SDK
 *
 * HTTP-based collections and documents management for frontend apps
 */

import {
  Document,
  DocumentFilter,
  DocumentQueryOptions,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from "../collections-service";
import { ApiResponse, PaginatedResponse, QueryOptions } from "../core";

import { BaseHttpClient } from "./base-http-client";

export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    unique: boolean;
    indexed: boolean;
    default?: unknown;
    validation?: Record<string, unknown>;
  }>;
  indexes: Array<{
    name: string;
    fields: string[];
    unique: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export class CollectionsHttpClient extends BaseHttpClient {
  // Constructor inherited from BaseHttpClient

  // Collection Management
  async createCollection(
    projectId: string,
    collectionData: {
      name: string;
      description?: string;
      fields: Array<{
        name: string;
        type: string;
        required?: boolean;
        unique?: boolean;
        indexed?: boolean;
        default?: unknown;
        validation?: Record<string, unknown>;
      }>;
      indexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
    }
  ): Promise<ApiResponse<Collection>> {
    return this.post<Collection>(
      `/projects/${projectId}/collections`,
      collectionData
    );
  }

  async getCollection(
    projectId: string,
    collectionName: string
  ): Promise<ApiResponse<Collection>> {
    return this.get<Collection>(
      `/projects/${projectId}/collections/${collectionName}`
    );
  }

  async updateCollection(
    projectId: string,
    collectionName: string,
    updates: {
      description?: string;
      fields?: Array<{
        name: string;
        type: string;
        required?: boolean;
        unique?: boolean;
        indexed?: boolean;
        default?: unknown;
        validation?: Record<string, unknown>;
      }>;
      indexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
    }
  ): Promise<ApiResponse<Collection>> {
    return this.put<Collection>(
      `/projects/${projectId}/collections/${collectionName}`,
      updates
    );
  }

  async deleteCollection(
    projectId: string,
    collectionName: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/collections/${collectionName}`
    );
  }

  async getProjectCollections(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Collection>> {
    return this.getPaginated<Collection>(
      `/projects/${projectId}/collections`,
      options
    );
  }

  // Document Management
  async createDocument(
    projectId: string,
    collectionName: string,
    documentData: CreateDocumentRequest
  ): Promise<ApiResponse<Document>> {
    return this.post<Document>(
      `/projects/${projectId}/collections/${collectionName}/documents`,
      documentData
    );
  }

  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<ApiResponse<Document>> {
    return this.get<Document>(
      `/projects/${projectId}/collections/${collectionName}/documents/${documentId}`
    );
  }

  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    updateData: UpdateDocumentRequest
  ): Promise<ApiResponse<Document>> {
    return this.put<Document>(
      `/projects/${projectId}/collections/${collectionName}/documents/${documentId}`,
      updateData
    );
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    options?: { deleted_by?: string }
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/collections/${collectionName}/documents/${documentId}${
        options?.deleted_by ? `?deleted_by=${options.deleted_by}` : ""
      }`
    );
  }

  async getDocuments(
    projectId: string,
    collectionName: string,
    filter?: DocumentFilter,
    options?: DocumentQueryOptions
  ): Promise<PaginatedResponse<Document>> {
    const queryParams = {
      ...(filter && { filter: JSON.stringify(filter) }),
      ...(options && options),
    };

    return this.getPaginated<Document>(
      `/projects/${projectId}/collections/${collectionName}/documents`,
      queryParams
    );
  }

  // Collection Schema Operations
  async validateCollectionSchema(
    projectId: string,
    collectionName: string
  ): Promise<
    ApiResponse<{
      valid: boolean;
      issues: Array<{
        type: string;
        field?: string;
        message: string;
        severity: "error" | "warning" | "info";
      }>;
    }>
  > {
    return this.post(
      `/projects/${projectId}/collections/${collectionName}/validate-schema`
    );
  }

  async getCollectionStatistics(
    projectId: string,
    collectionName: string
  ): Promise<
    ApiResponse<{
      total_documents: number;
      total_size_bytes: number;
      average_document_size: number;
      field_statistics: Record<
        string,
        {
          null_count: number;
          unique_values: number;
          most_common_values?: Array<{ value: unknown; count: number }>;
        }
      >;
      index_usage: Record<
        string,
        {
          size_bytes: number;
          scans: number;
          last_used?: string;
        }
      >;
    }>
  > {
    return this.get(
      `/projects/${projectId}/collections/${collectionName}/statistics`
    );
  }

  // Advanced Document Operations
  async bulkCreateDocuments(
    projectId: string,
    collectionName: string,
    documents: CreateDocumentRequest[]
  ): Promise<
    ApiResponse<{
      created: Document[];
      errors: Array<{
        index: number;
        error: string;
      }>;
    }>
  > {
    return this.post(
      `/projects/${projectId}/collections/${collectionName}/documents/bulk`,
      { documents }
    );
  }

  async bulkUpdateDocuments(
    projectId: string,
    collectionName: string,
    updates: Array<{
      id: string;
      data: Record<string, unknown>;
    }>
  ): Promise<
    ApiResponse<{
      updated: Document[];
      errors: Array<{
        id: string;
        error: string;
      }>;
    }>
  > {
    return this.put(
      `/projects/${projectId}/collections/${collectionName}/documents/bulk`,
      { updates }
    );
  }

  async bulkDeleteDocuments(
    projectId: string,
    collectionName: string,
    documentIds: string[],
    options?: { deleted_by?: string }
  ): Promise<
    ApiResponse<{
      deleted_count: number;
      errors: Array<{
        id: string;
        error: string;
      }>;
    }>
  > {
    return this.post(
      `/projects/${projectId}/collections/${collectionName}/documents/bulk-delete`,
      {
        document_ids: documentIds,
        ...(options?.deleted_by && { deleted_by: options.deleted_by }),
      }
    );
  }

  // Document Search and Filtering
  async searchDocuments(
    projectId: string,
    collectionName: string,
    query: {
      text?: string;
      fields?: string[];
      filters?: DocumentFilter;
      sort?: Array<{
        field: string;
        direction: "asc" | "desc";
      }>;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<Document & { _score?: number }>> {
    return this.post(
      `/projects/${projectId}/collections/${collectionName}/search`,
      query
    );
  }

  async aggregateDocuments(
    projectId: string,
    collectionName: string,
    aggregation: {
      group_by?: string[];
      aggregations: Record<
        string,
        {
          type: "count" | "sum" | "avg" | "min" | "max";
          field?: string;
        }
      >;
      filters?: DocumentFilter;
    }
  ): Promise<
    ApiResponse<{
      groups: Record<string, Record<string, number>>;
      total_groups: number;
    }>
  > {
    return this.post(
      `/projects/${projectId}/collections/${collectionName}/aggregate`,
      aggregation
    );
  }
}
