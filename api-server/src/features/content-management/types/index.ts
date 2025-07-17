/**
 * Content Management Feature Types
 * 
 * This file contains all TypeScript interfaces and types
 * specific to the content management functionality.
 */

import { ApiResponse } from "../../../types";

/**
 * Content item data structure
 */
export interface ContentItem {
  id: number;
  key: string;
  data: any;
  content_type: string;
  description?: string;
  route_path: string;
  schema_id?: number;
  schema?: ContentSchema;
  created_at: string;
  updated_at: string;
  created_by?: number;
  parent_route_id?: number;
}

/**
 * Content schema definition
 */
export interface ContentSchema {
  id?: number;
  name: string;
  description?: string;
  definition: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Content creation data
 */
export interface CreateContentData {
  key: string;
  data: any;
  content_type: string;
  description?: string;
  route_path: string;
  schema_id?: number;
  schema?: ContentSchema;
}

/**
 * Content update data
 */
export interface UpdateContentData {
  key?: string;
  data?: any;
  content_type?: string;
  description?: string;
  route_path?: string;
  schema_id?: number;
  schema?: ContentSchema;
}

/**
 * Content filters for querying
 */
export interface ContentFilters {
  route_path?: string;
  content_type?: string;
  key?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  created_after?: string;
  created_before?: string;
}

/**
 * Content statistics
 */
export interface ContentStats {
  totalContent: number;
  contentByType: Record<string, number>;
  contentByRoute: Record<string, number>;
  recentContent: ContentItem[];
  popularContent: ContentItem[];
}

/**
 * Content validation result
 */
export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Content export options
 */
export interface ContentExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeSchema?: boolean;
  filterByRoute?: string;
  filterByType?: string;
}

/**
 * Content import data
 */
export interface ContentImportData {
  items: CreateContentData[];
  overwriteExisting?: boolean;
  validateSchema?: boolean;
}

/**
 * Content bulk operation
 */
export interface ContentBulkOperation {
  action: 'delete' | 'update' | 'move';
  ids: number[];
  data?: Partial<UpdateContentData>;
}

/**
 * API Response types
 */
export interface ContentResponse extends ApiResponse<ContentItem> {}

export interface ContentListResponse extends ApiResponse<{
  items: ContentItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {}

export interface ContentStatsResponse extends ApiResponse<ContentStats> {}

export interface ContentExportResponse extends ApiResponse<{
  data: string;
  filename: string;
  format: string;
}> {}

export interface ContentImportResponse extends ApiResponse<{
  imported: number;
  errors: string[];
  warnings: string[];
}> {}

/**
 * Content type definitions
 */
export enum ContentType {
  TEXT = 'text',
  HTML = 'html',
  JSON = 'json',
  MARKDOWN = 'markdown',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  CUSTOM = 'custom'
}

/**
 * Content status
 */
export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Content errors
 */
export enum ContentError {
  CONTENT_NOT_FOUND = 'CONTENT_NOT_FOUND',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  INVALID_ROUTE_PATH = 'INVALID_ROUTE_PATH',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  INVALID_JSON = 'INVALID_JSON'
}