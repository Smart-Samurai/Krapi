/**
 * Changelog HTTP Client for KRAPI SDK
 *
 * HTTP-based changelog methods for frontend apps
 */

import { ApiResponse, PaginatedResponse } from "../core";

import { BaseHttpClient } from "./base-http-client";
export class ChangelogHttpClient extends BaseHttpClient {
  // Project Changelog
  async getProjectChangelog(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      action_type?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
      collection_name?: string;
      document_id?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      project_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.collection_name)
      params.append("collection_name", options.collection_name);
    if (options?.document_id) params.append("document_id", options.document_id);

    const url = params.toString()
      ? `/projects/${projectId}/changelog?${params}`
      : `/projects/${projectId}/changelog`;

    return this.getPaginated<{
      id: string;
      project_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>(url);
  }

  // Collection Changelog
  async getCollectionChangelog(
    projectId: string,
    collectionName: string,
    options?: {
      limit?: number;
      offset?: number;
      action_type?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
      document_id?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      project_id: string;
      collection_name: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.document_id) params.append("document_id", options.document_id);

    const url = params.toString()
      ? `/projects/${projectId}/collections/${collectionName}/changelog?${params}`
      : `/projects/${projectId}/collections/${collectionName}/changelog`;

    return this.getPaginated<{
      id: string;
      project_id: string;
      collection_name: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>(url);
  }

  // Document Changelog
  async getDocumentChangelog(
    projectId: string,
    collectionName: string,
    documentId: string,
    options?: {
      limit?: number;
      offset?: number;
      action_type?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      project_id: string;
      collection_name: string;
      document_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      field_changes: Array<{
        field_name: string;
        old_value: unknown;
        new_value: unknown;
      }>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/projects/${projectId}/collections/${collectionName}/documents/${documentId}/changelog?${params}`
      : `/projects/${projectId}/collections/${collectionName}/documents/${documentId}/changelog`;

    return this.getPaginated<{
      id: string;
      project_id: string;
      collection_name: string;
      document_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      field_changes: Array<{
        field_name: string;
        old_value: unknown;
        new_value: unknown;
      }>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>(url);
  }

  // User Activity
  async getUserActivity(
    projectId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action_type?: string;
      start_date?: string;
      end_date?: string;
      entity_type?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      project_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.entity_type) params.append("entity_type", options.entity_type);

    const url = params.toString()
      ? `/projects/${projectId}/users/${userId}/activity?${params}`
      : `/projects/${projectId}/users/${userId}/activity`;

    return this.getPaginated<{
      id: string;
      project_id: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>(url);
  }

  // System-wide Changelog (Admin only)
  async getSystemChangelog(options?: {
    limit?: number;
    offset?: number;
    action_type?: string;
    user_id?: string;
    project_id?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<
    PaginatedResponse<{
      id: string;
      project_id?: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.project_id) params.append("project_id", options.project_id);
    if (options?.entity_type) params.append("entity_type", options.entity_type);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);

    const url = params.toString()
      ? `/admin/changelog?${params}`
      : "/admin/changelog";

    return this.getPaginated<{
      id: string;
      project_id?: string;
      user_id: string;
      username: string;
      action: string;
      action_type: string;
      entity_type: string;
      entity_id: string;
      entity_name: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>(url);
  }

  // Changelog Statistics
  async getChangelogStatistics(
    projectId: string,
    options?: {
      period: "hour" | "day" | "week" | "month";
      start_date?: string;
      end_date?: string;
      group_by?: "action_type" | "entity_type" | "user_id";
    }
  ): Promise<
    ApiResponse<{
      period: string;
      start_date: string;
      end_date: string;
      total_entries: number;
      entries_by_action_type: Record<string, number>;
      entries_by_entity_type: Record<string, number>;
      entries_by_user: Record<string, number>;
      daily_activity: Array<{
        date: string;
        count: number;
        action_types: Record<string, number>;
      }>;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.period) params.append("period", options.period);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.group_by) params.append("group_by", options.group_by);

    const url = params.toString()
      ? `/projects/${projectId}/changelog/statistics?${params}`
      : `/projects/${projectId}/changelog/statistics`;

    return this.get<{
      period: string;
      start_date: string;
      end_date: string;
      total_entries: number;
      entries_by_action_type: Record<string, number>;
      entries_by_entity_type: Record<string, number>;
      entries_by_user: Record<string, number>;
      daily_activity: Array<{
        date: string;
        count: number;
        action_types: Record<string, number>;
      }>;
    }>(url);
  }

  // Export Changelog
  async exportChangelog(
    projectId: string,
    options?: {
      format: "json" | "csv" | "xml";
      start_date?: string;
      end_date?: string;
      action_type?: string;
      user_id?: string;
      entity_type?: string;
    }
  ): Promise<
    ApiResponse<{
      success: boolean;
      download_url: string;
      expires_at: string;
      file_size: number;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.format) params.append("format", options.format);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.action_type) params.append("action_type", options.action_type);
    if (options?.user_id) params.append("user_id", options.user_id);
    if (options?.entity_type) params.append("entity_type", options.entity_type);

    const url = params.toString()
      ? `/projects/${projectId}/changelog/export?${params}`
      : `/projects/${projectId}/changelog/export`;

    return this.post<{
      success: boolean;
      download_url: string;
      expires_at: string;
      file_size: number;
    }>(url);
  }

  // Purge Old Changelog Entries (Admin only)
  async purgeOldChangelog(options?: {
    older_than_days: number;
    project_id?: string;
    action_type?: string;
    entity_type?: string;
  }): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      purged_count: number;
      freed_space: number;
    }>
  > {
    return this.delete<{
      success: boolean;
      message: string;
      purged_count: number;
      freed_space: number;
    }>("/admin/changelog/purge", options);
  }
}
