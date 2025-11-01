/**
 * Admin HTTP Client for KRAPI SDK
 *
 * HTTP-based admin methods for frontend apps
 */

import { ApiResponse, PaginatedResponse } from "../core";

import { BaseHttpClient } from "./base-http-client";
export class AdminHttpClient extends BaseHttpClient {
  // User Management
  async getAllUsers(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
    status?: string;
    project_id?: string;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.search) params.append("search", options.search);
    if (options?.role) params.append("role", options.role);
    if (options?.status) params.append("status", options.status);
    if (options?.project_id) params.append("project_id", options.project_id);

    const url = params.toString() ? `/admin/users?${params}` : "/admin/users";

    return this.getPaginated<Record<string, unknown>>(url);
  }

  async getUser(userId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.get<Record<string, unknown>>(`/admin/users/${userId}`);
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    role: "admin" | "user";
    project_id?: string;
    permissions?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>("/admin/users", userData);
  }

  async updateUser(
    userId: string,
    updates: Partial<{
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      role: "admin" | "user";
      is_active: boolean;
      permissions: string[];
      metadata: Record<string, unknown>;
    }>
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(`/admin/users/${userId}`, updates);
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/admin/users/${userId}`);
  }

  async updateUserRole(
    userId: string,
    role: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(`/admin/users/${userId}/role`, {
      role,
    });
  }

  async updateUserPermissions(
    userId: string,
    permissions: string[]
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/users/${userId}/permissions`,
      { permissions }
    );
  }

  async activateUser(
    userId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/users/${userId}/activate`,
      {}
    );
  }

  async deactivateUser(
    userId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/users/${userId}/deactivate`,
      {}
    );
  }

  // API Key Management
  async createApiKey(
    userId: string,
    keyData: {
      name: string;
      permissions: string[];
      expires_at?: string;
    }
  ): Promise<ApiResponse<{ key: string; data: Record<string, unknown> }>> {
    return this.post<{ key: string; data: Record<string, unknown> }>(
      `/admin/api-keys`,
      {
        user_id: userId,
        ...keyData,
      }
    );
  }

  // Project Management
  async getAllProjects(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    owner_id?: string;
  }): Promise<PaginatedResponse<Record<string, unknown>>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.search) params.append("search", options.search);
    if (options?.status) params.append("status", options.status);
    if (options?.owner_id) params.append("owner_id", options.owner_id);

    const url = params.toString()
      ? `/admin/projects?${params}`
      : "/admin/projects";

    return this.getPaginated<Record<string, unknown>>(url);
  }

  async getProject(
    projectId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.get<Record<string, unknown>>(`/admin/projects/${projectId}`);
  }

  async updateProject(
    projectId: string,
    updates: Partial<{
      name: string;
      description: string;
      status: string;
      settings: Record<string, unknown>;
    }>
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/projects/${projectId}`,
      updates
    );
  }

  async deleteProject(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/admin/projects/${projectId}`);
  }

  async suspendProject(
    projectId: string,
    reason?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/projects/${projectId}/suspend`,
      { reason }
    );
  }

  async activateProject(
    projectId: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.put<Record<string, unknown>>(
      `/admin/projects/${projectId}/activate`,
      {}
    );
  }

  // System Monitoring
  async getSystemOverview(): Promise<
    ApiResponse<{
      total_users: number;
      active_users: number;
      total_projects: number;
      active_projects: number;
      total_storage_used: number;
      system_health: {
        database: boolean;
        storage: boolean;
        email: boolean;
        overall: boolean;
      };
      recent_activity: Array<{
        timestamp: string;
        action: string;
        user: string;
        details: string;
      }>;
    }>
  > {
    return this.get<{
      total_users: number;
      active_users: number;
      total_projects: number;
      active_projects: number;
      total_storage_used: number;
      system_health: {
        database: boolean;
        storage: boolean;
        email: boolean;
        overall: boolean;
      };
      recent_activity: Array<{
        timestamp: string;
        action: string;
        user: string;
        details: string;
      }>;
    }>("/admin/overview");
  }

  async getSystemMetrics(options?: {
    period: "hour" | "day" | "week" | "month";
    start_date?: string;
    end_date?: string;
  }): Promise<
    ApiResponse<{
      period: string;
      start_date: string;
      end_date: string;
      user_registrations: Array<{ date: string; count: number }>;
      project_creations: Array<{ date: string; count: number }>;
      storage_usage: Array<{ date: string; bytes: number }>;
      api_requests: Array<{ date: string; count: number }>;
      error_rates: Array<{ date: string; percentage: number }>;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.period) params.append("period", options.period);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/admin/metrics?${params}`
      : "/admin/metrics";

    return this.get<{
      period: string;
      start_date: string;
      end_date: string;
      user_registrations: Array<{ date: string; count: number }>;
      project_creations: Array<{ date: string; count: number }>;
      storage_usage: Array<{ date: string; bytes: number }>;
      api_requests: Array<{ date: string; count: number }>;
      error_rates: Array<{ date: string; percentage: number }>;
    }>(url);
  }

  // Security Management
  async getSecurityLogs(options?: {
    level?: "info" | "warn" | "error" | "critical";
    user_id?: string;
    action_type?: string;
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<
    PaginatedResponse<{
      timestamp: string;
      level: string;
      user_id: string;
      username: string;
      action: string;
      ip_address: string;
      user_agent: string;
      details: Record<string, unknown>;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.level) params.append("level", options.level);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/admin/security/logs?${params}`
      : "/admin/security/logs";

    return this.getPaginated<{
      timestamp: string;
      level: string;
      user_id: string;
      username: string;
      action: string;
      ip_address: string;
      user_agent: string;
      details: Record<string, unknown>;
    }>(url);
  }

  async getFailedLoginAttempts(options?: {
    limit?: number;
    offset?: number;
    user_id?: string;
    ip_address?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<
    PaginatedResponse<{
      timestamp: string;
      user_id?: string;
      username?: string;
      ip_address: string;
      user_agent: string;
      reason: string;
      attempt_count: number;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.ip_address) params.append("ip_address", options.ip_address);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/admin/security/failed-logins?${params}`
      : "/admin/security/failed-logins";

    return this.getPaginated<{
      timestamp: string;
      user_id?: string;
      username?: string;
      ip_address: string;
      user_agent: string;
      reason: string;
      attempt_count: number;
    }>(url);
  }

  async blockIP(
    ipAddress: string,
    reason: string,
    duration_hours?: number
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>("/admin/security/block-ip", {
      ip_address: ipAddress,
      reason,
      duration_hours,
    });
  }

  async unblockIP(
    ipAddress: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/admin/security/block-ip/${ipAddress}`
    );
  }

  async getBlockedIPs(): Promise<
    ApiResponse<
      Array<{
        ip_address: string;
        reason: string;
        blocked_at: string;
        expires_at?: string;
        blocked_by: string;
      }>
    >
  > {
    return this.get<
      Array<{
        ip_address: string;
        reason: string;
        blocked_at: string;
        expires_at?: string;
        blocked_by: string;
      }>
    >("/admin/security/blocked-ips");
  }

  // Maintenance Operations
  async runSystemMaintenance(): Promise<
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
    }>("/admin/maintenance/run");
  }

  async backupSystem(options?: {
    include_files: boolean;
    include_database: boolean;
    compression: boolean;
  }): Promise<
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
    }>("/admin/maintenance/backup", options);
  }

  async restoreSystem(backupPath: string): Promise<
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
    }>("/admin/maintenance/restore", { backup_path: backupPath });
  }

  async clearOldLogs(options?: {
    older_than_days: number;
    log_types: string[];
  }): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      cleared_count: number;
      freed_space: number;
    }>
  > {
    return this.delete<{
      success: boolean;
      message: string;
      cleared_count: number;
      freed_space: number;
    }>("/admin/maintenance/clear-logs", options);
  }
}
