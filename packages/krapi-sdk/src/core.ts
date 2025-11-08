/**
 * Core SDK Types and Interfaces
 * 
 * Shared types and interfaces used across the SDK for both
 * database operations and HTTP client operations.
 * 
 * @module core
 */

/**
 * Database Connection Interface
 * 
 * Defines the interface for database connections used by the SDK.
 * 
 * @interface DatabaseConnection
 * @property {Function} query - Execute SQL query with parameters
 * @property {Function} [connect] - Connect to database (optional)
 * @property {Function} [end] - Close database connection (optional)
 */
// Database Connection Interface
export interface DatabaseConnection {
  query: (
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  connect?: () => Promise<void>;
  end?: () => Promise<void>;
}

/**
 * Logger Interface
 * 
 * Defines the interface for loggers used by the SDK.
 * 
 * @interface Logger
 * @property {Function} info - Log info messages
 * @property {Function} warn - Log warning messages
 * @property {Function} error - Log error messages
 * @property {Function} debug - Log debug messages
 */
// Logger Interface
export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

/**
 * SDK Configuration for Database Operations
 * 
 * Configuration for SDK when using database mode (server-side).
 * 
 * @interface DatabaseSDKConfig
 * @property {DatabaseConnection} databaseConnection - Database connection (required)
 * @property {Logger} [logger] - Logger instance
 * @property {boolean} [enableAutoFix] - Enable automatic schema fixes
 * @property {boolean} [enableHealthChecks] - Enable health checks
 * @property {number} [maxRetries] - Maximum retry attempts
 */
// SDK Configuration for Database Operations
export interface DatabaseSDKConfig {
  databaseConnection: DatabaseConnection;
  logger?: Logger;
  enableAutoFix?: boolean;
  enableHealthChecks?: boolean;
  maxRetries?: number;
}

/**
 * SDK Configuration for HTTP Client Operations
 * 
 * Configuration for SDK when using HTTP client mode (client-side).
 * 
 * @interface HttpSDKConfig
 * @property {string} baseUrl - Base URL for API requests
 * @property {string} [apiKey] - API key for authentication
 * @property {string} [sessionToken] - Session token for authentication
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {Logger} [logger] - Logger instance
 */
// SDK Configuration for HTTP Client Operations
export interface HttpSDKConfig {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;
  logger?: Logger;
}

/**
 * Common API Response Type
 * 
 * Standard response format for all API operations.
 * 
 * @interface ApiResponse
 * @template T - Response data type
 * @property {boolean} success - Whether the operation succeeded
 * @property {T} [data] - Response data (if successful)
 * @property {string} [error] - Error message (if failed)
 * @property {string} [message] - Additional message
 * @property {string} [timestamp] - Response timestamp
 */
// Common API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Paginated API Response Type
 * 
 * Response format for paginated API operations.
 * 
 * @interface PaginatedResponse
 * @template T - Response data item type
 * @extends {ApiResponse<T[]>}
 * @property {Object} [pagination] - Pagination information
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of items
 * @property {number} pagination.totalPages - Total number of pages
 * @property {boolean} pagination.hasNext - Whether there is a next page
 * @property {boolean} pagination.hasPrev - Whether there is a previous page
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Common Query Options
 * 
 * Options for querying data with pagination, search, sorting, and filtering.
 * 
 * @interface QueryOptions
 * @property {number} [limit] - Maximum number of items to return
 * @property {number} [offset] - Number of items to skip
 * @property {string} [search] - Search term
 * @property {string} [sortBy] - Field to sort by
 * @property {"asc" | "desc"} [sortOrder] - Sort order
 * @property {Record<string, unknown>} [filters] - Additional filters
 */
// Common Query Options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

/**
 * Base Client Interface
 * 
 * Base interface for both database and HTTP client operations.
 * 
 * @interface BaseClient
 * @property {Function} [close] - Close the client connection (optional)
 */
// Base Client Interface for both Database and HTTP operations
export interface BaseClient {
  close?: () => Promise<void>;
}

/**
 * SDK Error Type
 * 
 * Extended error type for SDK-specific errors.
 * 
 * @interface SDKError
 * @extends {Error}
 * @property {string} [code] - Error code
 * @property {number} [status] - HTTP status code (if applicable)
 * @property {boolean} [isApiError] - Whether this is an API error
 * @property {boolean} [isNetworkError] - Whether this is a network error
 * @property {boolean} [isConfigError] - Whether this is a configuration error
 * @property {Error} [originalError] - Original error (if wrapped)
 */
// Error Types
export interface SDKError extends Error {
  code?: string;
  status?: number;
  isApiError?: boolean;
  isNetworkError?: boolean;
  isConfigError?: boolean;
  originalError?: Error;
}

/**
 * Environment Type
 * 
 * Application environment type.
 * 
 * @typedef {"development" | "staging" | "production"} Environment
 */

// Environment Types
export type Environment = "development" | "staging" | "production";

/**
 * Field Type Enum
 * 
 * Supported field types for collection fields.
 * 
 * @enum {string} FieldType
 */
// Common field types used across collections
export enum FieldType {
  string = "string",
  text = "text",
  number = "number",
  integer = "integer",
  float = "float",
  boolean = "boolean",
  date = "date",
  datetime = "datetime",
  time = "time",
  timestamp = "timestamp",
  email = "email",
  url = "url",
  phone = "phone",
  uuid = "uuid",
  uniqueID = "uniqueID",
  json = "json",
  array = "array",
  object = "object",
  file = "file",
  image = "image",
  video = "video",
  audio = "audio",
  reference = "reference",
  relation = "relation",
  enum = "enum",
  password = "password",
  encrypted = "encrypted",
  varchar = "varchar",
  decimal = "decimal",
}
