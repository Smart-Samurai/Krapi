/**
 * Health HTTP Client for KRAPI SDK
 * 
 * HTTP-based health and diagnostics methods for frontend applications.
 * Provides system health checks, database diagnostics, and auto-fixing capabilities.
 * 
 * @module http-clients/health-http-client
 * @example
 * const client = new HealthHttpClient({ baseUrl: 'https://api.example.com' });
 * const health = await client.check();
 */
import { ApiResponse } from "../core";
import {
  DatabaseHealth,
  SystemHealth,
  TestResult,
  SchemaValidationResult,
  AutoFixResult,
  MigrationResult,
} from "../health-service";

import { BaseHttpClient } from "./base-http-client";

/**
 * Health HTTP Client
 * 
 * HTTP client for health and diagnostics operations.
 * 
 * @class HealthHttpClient
 * @extends {BaseHttpClient}
 * @example
 * const client = new HealthHttpClient({ baseUrl: 'https://api.example.com' });
 * const diagnostics = await client.runDiagnostics();
 */
export class HealthHttpClient extends BaseHttpClient {
  // System Health
  async check(): Promise<ApiResponse<SystemHealth>> {
    return this.get<SystemHealth>("/health");
  }

  async checkDatabase(): Promise<ApiResponse<DatabaseHealth>> {
    return this.get<DatabaseHealth>("/health/database");
  }

  async checkStorage(): Promise<
    ApiResponse<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>
  > {
    return this.get<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>("/health/storage");
  }

  async checkEmail(): Promise<
    ApiResponse<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>
  > {
    return this.get<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>("/health/email");
  }

  async checkAll(): Promise<
    ApiResponse<{
      overall: boolean;
      services: {
        database: DatabaseHealth;
        storage: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
        email: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
        api: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
      };
      timestamp: string;
    }>
  > {
    return this.get<{
      overall: boolean;
      services: {
        database: DatabaseHealth;
        storage: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
        email: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
        api: {
          healthy: boolean;
          message: string;
          details?: Record<string, unknown>;
        };
      };
      timestamp: string;
    }>("/health/all");
  }

  // Diagnostics
  async runDiagnostics(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  > {
    return this.post<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>("/health/diagnostics");
  }

  async runDatabaseDiagnostics(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  > {
    return this.post<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>("/health/diagnostics/database");
  }

  async runStorageDiagnostics(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  > {
    return this.post<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>("/health/diagnostics/storage");
  }

  async runEmailDiagnostics(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  > {
    return this.post<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>("/health/diagnostics/email");
  }

  // Schema Validation
  async validateSchema(): Promise<ApiResponse<SchemaValidationResult>> {
    return this.get<SchemaValidationResult>("/health/schema");
  }

  async validateProjectSchema(
    projectId: string
  ): Promise<ApiResponse<SchemaValidationResult>> {
    return this.get<SchemaValidationResult>(
      `/projects/${projectId}/health/schema`
    );
  }

  async validateCollectionSchema(
    projectId: string,
    collectionId: string
  ): Promise<ApiResponse<SchemaValidationResult>> {
    return this.get<SchemaValidationResult>(
      `/projects/${projectId}/collections/${collectionId}/health/schema`
    );
  }

  // Auto-Fix
  async autoFix(): Promise<ApiResponse<AutoFixResult>> {
    return this.post<AutoFixResult>("/health/repair");
  }

  async autoFixDatabase(): Promise<ApiResponse<AutoFixResult>> {
    return this.post<AutoFixResult>("/health/auto-fix/database");
  }

  async autoFixSchema(): Promise<ApiResponse<AutoFixResult>> {
    return this.post<AutoFixResult>("/health/auto-fix/schema");
  }

  async autoFixProject(projectId: string): Promise<ApiResponse<AutoFixResult>> {
    return this.post<AutoFixResult>(`/projects/${projectId}/health/auto-fix`);
  }

  async autoFixCollection(
    projectId: string,
    collectionId: string
  ): Promise<ApiResponse<AutoFixResult>> {
    return this.post<AutoFixResult>(
      `/projects/${projectId}/collections/${collectionId}/health/auto-fix`
    );
  }

  // Database Operations
  async repairDatabase(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      repaired_tables?: string[];
      repaired_indexes?: string[];
      repaired_constraints?: string[];
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      repaired_tables?: string[];
      repaired_indexes?: string[];
      repaired_constraints?: string[];
      duration: number;
    }>("/health/database/repair");
  }

  async optimizeDatabase(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      optimized_tables?: string[];
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      optimized_tables?: string[];
      duration: number;
    }>("/health/database/optimize");
  }

  async backupDatabase(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      backup_path?: string;
      backup_size?: number;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      backup_path?: string;
      backup_size?: number;
      duration: number;
    }>("/health/database/backup");
  }

  async restoreDatabase(backupPath: string): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      duration: number;
    }>("/health/database/restore", { backup_path: backupPath });
  }

  // Migrations
  async getMigrations(): Promise<
    ApiResponse<{
      applied: Array<{
        id: string;
        name: string;
        applied_at: string;
        duration: number;
      }>;
      pending: Array<{
        id: string;
        name: string;
        description: string;
        estimated_duration: number;
      }>;
      failed: Array<{
        id: string;
        name: string;
        failed_at: string;
        error: string;
      }>;
    }>
  > {
    return this.get<{
      applied: Array<{
        id: string;
        name: string;
        applied_at: string;
        duration: number;
      }>;
      pending: Array<{
        id: string;
        name: string;
        description: string;
        estimated_duration: number;
      }>;
      failed: Array<{
        id: string;
        name: string;
        failed_at: string;
        error: string;
      }>;
    }>("/health/migrations");
  }

  async runMigrations(): Promise<ApiResponse<MigrationResult>> {
    return this.post<MigrationResult>("/health/migrations/run");
  }

  async runMigration(migrationId: string): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      duration: number;
    }>(`/health/migrations/${migrationId}/run`);
  }

  async rollbackMigration(migrationId: string): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      duration: number;
    }>(`/health/migrations/${migrationId}/rollback`);
  }

  // Performance Monitoring
  async getPerformanceMetrics(options?: {
    period: "hour" | "day" | "week" | "month";
    start_date?: string;
    end_date?: string;
  }): Promise<
    ApiResponse<{
      period: string;
      start_date: string;
      end_date: string;
      database: {
        query_count: number;
        avg_query_time: number;
        slow_queries: number;
        connection_count: number;
        active_connections: number;
      };
      api: {
        request_count: number;
        avg_response_time: number;
        error_rate: number;
        active_users: number;
      };
      storage: {
        read_operations: number;
        write_operations: number;
        avg_read_time: number;
        avg_write_time: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (options?.period) params.append("period", options.period);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/health/performance?${params}`
      : "/health/performance";

    return this.get<{
      period: string;
      start_date: string;
      end_date: string;
      database: {
        query_count: number;
        avg_query_time: number;
        slow_queries: number;
        connection_count: number;
        active_connections: number;
      };
      api: {
        request_count: number;
        avg_response_time: number;
        error_rate: number;
        active_users: number;
      };
      storage: {
        read_operations: number;
        write_operations: number;
        avg_read_time: number;
        avg_write_time: number;
      };
    }>(url);
  }

  // System Information
  async getSystemInfo(): Promise<
    ApiResponse<{
      version: string;
      environment: string;
      uptime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      cpu: {
        usage: number;
        cores: number;
        load_average: number[];
      };
      disk: {
        used: number;
        total: number;
        percentage: number;
      };
      network: {
        bytes_in: number;
        bytes_out: number;
        connections: number;
      };
      processes: {
        total: number;
        running: number;
        sleeping: number;
        stopped: number;
        zombie: number;
      };
    }>
  > {
    return this.get<{
      version: string;
      environment: string;
      uptime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      cpu: {
        usage: number;
        cores: number;
        load_average: number[];
      };
      disk: {
        used: number;
        total: number;
        percentage: number;
      };
      network: {
        bytes_in: number;
        bytes_out: number;
        connections: number;
      };
      processes: {
        total: number;
        running: number;
        sleeping: number;
        stopped: number;
        zombie: number;
      };
    }>("/health/system");
  }

  // Logs
  async getLogs(options?: {
    level?: "debug" | "info" | "warn" | "error";
    service?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<
    ApiResponse<{
      logs: Array<{
        timestamp: string;
        level: string;
        service: string;
        message: string;
        metadata?: Record<string, unknown>;
      }>;
      total: number;
      has_more: boolean;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.level) params.append("level", options.level);
    if (options?.service) params.append("service", options.service);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.search) params.append("search", options.search);

    const url = params.toString() ? `/health/logs?${params}` : "/health/logs";

    return this.get<{
      logs: Array<{
        timestamp: string;
        level: string;
        service: string;
        message: string;
        metadata?: Record<string, unknown>;
      }>;
      total: number;
      has_more: boolean;
    }>(url);
  }

  async clearLogs(options?: {
    level?: "debug" | "info" | "warn" | "error";
    service?: string;
    older_than_days?: number;
  }): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      cleared_count: number;
    }>
  > {
    return this.delete<{
      success: boolean;
      message: string;
      cleared_count: number;
    }>("/health/logs", options);
  }
}
