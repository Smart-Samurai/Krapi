/**
 * System HTTP Client for KRAPI SDK
 * 
 * HTTP-based system methods for frontend applications.
 * Provides system settings management, email testing, and system information.
 * 
 * @module http-clients/system-http-client
 * @example
 * const client = new SystemHttpClient({ baseUrl: 'https://api.example.com' });
 * const settings = await client.getSettings();
 */
import { ApiResponse } from "../core";

import { BaseHttpClient } from "./base-http-client";

/**
 * System Settings Interface
 * 
 * @interface SystemSettings
 * @property {Object} general - General system settings
 * @property {Object} security - Security settings
 * @property {Object} email - Email configuration
 * @property {Object} database - Database settings
 */
export interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    defaultLanguage: string;
  };
  security: {
    requireTwoFactor: boolean;
    sessionTimeout: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    maxLoginAttempts: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  database: {
    connectionPoolSize: number;
    queryTimeout: number;
    enableQueryLogging: boolean;
    backupSchedule: string;
    backupRetentionDays: number;
  };
}

/**
 * System HTTP Client
 * 
 * HTTP client for system operations.
 * 
 * @class SystemHttpClient
 * @extends {BaseHttpClient}
 * @example
 * const client = new SystemHttpClient({ baseUrl: 'https://api.example.com' });
 * const settings = await client.getSettings();
 */
export class SystemHttpClient extends BaseHttpClient {
  // System Settings
  async getSettings(): Promise<ApiResponse<SystemSettings>> {
    return this.get<SystemSettings>("/system/settings");
  }

  async updateSettings(
    updates: Partial<SystemSettings>
  ): Promise<ApiResponse<SystemSettings>> {
    return this.put<SystemSettings>("/system/settings", updates);
  }

  // Email Configuration Testing
  async testEmailConfig(emailConfig: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    toEmail: string;
  }): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.post<{ success: boolean; message?: string }>(
      "/system/test-email",
      emailConfig
    );
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
      database: {
        size_bytes: number;
        tables_count: number;
        connections: number;
        uptime: number;
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
      database: {
        size_bytes: number;
        tables_count: number;
        connections: number;
        uptime: number;
      };
    }>("/system/info");
  }

  // System Maintenance
  async runMaintenance(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      tasks_completed: string[];
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      tasks_completed: string[];
      duration: number;
    }>("/system/maintenance");
  }

  async backupSystem(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      backup_path: string;
      backup_size: number;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      message: string;
      backup_path: string;
      backup_size: number;
      duration: number;
    }>("/system/backup");
  }

  // User Management
  async getSystemUsers(): Promise<
    ApiResponse<
      Array<{
        id: string;
        username: string;
        email: string;
        role: "admin" | "user";
        is_active: boolean;
        last_login?: string;
        created_at: string;
      }>
    >
  > {
    return this.get<
      Array<{
        id: string;
        username: string;
        email: string;
        role: "admin" | "user";
        is_active: boolean;
        last_login?: string;
        created_at: string;
      }>
    >("/system/users");
  }

  async createSystemUser(userData: {
    username: string;
    email: string;
    password: string;
    role: "admin" | "user";
  }): Promise<
    ApiResponse<{
      id: string;
      username: string;
      email: string;
      role: "admin" | "user";
      is_active: boolean;
      created_at: string;
    }>
  > {
    return this.post<{
      id: string;
      username: string;
      email: string;
      role: "admin" | "user";
      is_active: boolean;
      created_at: string;
    }>("/system/users", userData);
  }

  async updateSystemUser(
    userId: string,
    updates: Partial<{
      username: string;
      email: string;
      role: "admin" | "user";
      is_active: boolean;
    }>
  ): Promise<
    ApiResponse<{
      id: string;
      username: string;
      email: string;
      role: "admin" | "user";
      is_active: boolean;
      last_login?: string;
      created_at: string;
    }>
  > {
    return this.put<{
      id: string;
      username: string;
      email: string;
      role: "admin" | "user";
      is_active: boolean;
      last_login?: string;
      created_at: string;
    }>(`/system/users/${userId}`, updates);
  }

  async deleteSystemUser(
    userId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/system/users/${userId}`);
  }

  // System Logs
  async getSystemLogs(options?: {
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

    const url = params.toString() ? `/system/logs?${params}` : "/system/logs";

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

  async clearSystemLogs(options?: {
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
    }>("/system/logs", options);
  }
}
