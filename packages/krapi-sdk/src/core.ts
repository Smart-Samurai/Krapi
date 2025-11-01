/**
 * Core SDK Types and Interfaces
 *
 * Shared types and interfaces used across the SDK for both
 * database operations and HTTP client operations.
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

// Logger Interface
export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

// SDK Configuration for Database Operations
export interface DatabaseSDKConfig {
  databaseConnection: DatabaseConnection;
  logger?: Logger;
  enableAutoFix?: boolean;
  enableHealthChecks?: boolean;
  maxRetries?: number;
}

// SDK Configuration for HTTP Client Operations
export interface HttpSDKConfig {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;
  logger?: Logger;
}

// Common API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

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

// Common Query Options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

// Base Client Interface for both Database and HTTP operations
export interface BaseClient {
  close?: () => Promise<void>;
}

// Error Types
export interface SDKError extends Error {
  code?: string;
  status?: number;
  isApiError?: boolean;
  isNetworkError?: boolean;
  isConfigError?: boolean;
  originalError?: Error;
}

// Environment Types
export type Environment = "development" | "staging" | "production";

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
