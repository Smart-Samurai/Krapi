/**
 * Projects HTTP Client for KRAPI SDK
 *
 * HTTP-based project management methods for frontend apps
 */

import { ApiResponse, PaginatedResponse, QueryOptions } from "../core";
import {
  Project,
  ProjectSettings,
  ProjectStatistics,
  ProjectApiKey,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../projects-service";

import { BaseHttpClient } from "./base-http-client";

export class ProjectsHttpClient extends BaseHttpClient {
  // Constructor inherited from BaseHttpClient

  // Project CRUD Operations
  async createProject(
    projectData: CreateProjectRequest
  ): Promise<ApiResponse<Project>> {
    return this.post<Project>("/projects", projectData);
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/projects/${projectId}`);
  }

  async updateProject(
    projectId: string,
    updates: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> {
    return this.put<Project>(`/projects/${projectId}`, updates);
  }

  async deleteProject(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/projects/${projectId}`);
  }

  async getAllProjects(
    options?: QueryOptions
  ): Promise<PaginatedResponse<Project>> {
    return this.getPaginated<Project>("/projects", options);
  }

  // Project Settings
  async getProjectSettings(
    projectId: string
  ): Promise<ApiResponse<ProjectSettings>> {
    return this.get<ProjectSettings>(`/projects/${projectId}/settings`);
  }

  async updateProjectSettings(
    projectId: string,
    settings: Partial<ProjectSettings>
  ): Promise<ApiResponse<ProjectSettings>> {
    return this.put<ProjectSettings>(
      `/projects/${projectId}/settings`,
      settings
    );
  }

  // Project Statistics
  async getProjectStatistics(
    projectId: string
  ): Promise<ApiResponse<ProjectStatistics>> {
    return this.get<ProjectStatistics>(`/projects/${projectId}/statistics`);
  }

  // Project API Keys
  async createProjectApiKey(
    projectId: string,
    keyData: {
      name: string;
      scopes: string[];
      expires_at?: string;
      rate_limit?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<ProjectApiKey>> {
    return this.post<ProjectApiKey>(`/projects/${projectId}/api-keys`, keyData);
  }

  async getProjectApiKeys(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<ProjectApiKey>> {
    return this.getPaginated<ProjectApiKey>(
      `/projects/${projectId}/api-keys`,
      options
    );
  }

  async getProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<ApiResponse<ProjectApiKey>> {
    return this.get<ProjectApiKey>(`/projects/${projectId}/api-keys/${keyId}`);
  }

  async updateProjectApiKey(
    projectId: string,
    keyId: string,
    updates: Partial<{
      name: string;
      scopes: string[];
      expires_at: string;
      is_active: boolean;
      rate_limit: number;
      metadata: Record<string, unknown>;
    }>
  ): Promise<ApiResponse<ProjectApiKey>> {
    return this.put<ProjectApiKey>(
      `/projects/${projectId}/api-keys/${keyId}`,
      updates
    );
  }

  async deleteProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/api-keys/${keyId}`
    );
  }

  async regenerateProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<ApiResponse<ProjectApiKey>> {
    return this.post<ProjectApiKey>(
      `/projects/${projectId}/api-keys/${keyId}/regenerate`
    );
  }

  // Project Activity
  async getProjectActivity(
    projectId: string,
    options?: QueryOptions & {
      action_type?: string;
      entity_type?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      user_id: string;
      details: Record<string, unknown>;
      timestamp: string;
    }>
  > {
    return this.getPaginated(`/projects/${projectId}/activity`, options);
  }

  // Project Users (delegates to users service but scoped to project)
  async inviteUserToProject(
    projectId: string,
    userData: {
      email: string;
      role: string;
      permissions: string[];
      send_invite_email?: boolean;
    }
  ): Promise<ApiResponse<{ success: boolean; invitation_id: string }>> {
    return this.post(`/projects/${projectId}/invite`, userData);
  }

  async removeUserFromProject(
    projectId: string,
    userId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete(`/projects/${projectId}/users/${userId}`);
  }
}
