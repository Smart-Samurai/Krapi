import KrapiClient, { KrapiResponse } from "./client";
import { Project, ProjectApiKey, DatabaseStats } from "./types";

export class KrapiAdmin {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Projects
  async listProjects(): Promise<KrapiResponse<Project[]>> {
    return this.client.request("admin", "projects", "list");
  }

  async getProject(projectId: string): Promise<KrapiResponse<Project>> {
    return this.client.request("admin", "projects", "get", { projectId });
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    domain?: string;
    id?: string;
    settings?: Record<string, unknown>;
  }): Promise<KrapiResponse<Project>> {
    return this.client.request("admin", "projects", "create", projectData);
  }

  async updateProject(
    projectId: string,
    updates: Partial<Project>
  ): Promise<KrapiResponse<Project>> {
    return this.client.request("admin", "projects", "update", {
      projectId,
      ...updates,
    });
  }

  async deleteProject(projectId: string): Promise<KrapiResponse> {
    return this.client.request("admin", "projects", "delete", { projectId });
  }

  // API Keys
  async listApiKeys(): Promise<KrapiResponse<ProjectApiKey[]>> {
    return this.client.request("admin", "keys", "list");
  }

  async createApiKey(keyData: {
    name: string;
    permissions?: string[];
    expiresAt?: string;
  }): Promise<KrapiResponse<ProjectApiKey>> {
    return this.client.request("admin", "keys", "create", keyData);
  }

  async deleteApiKey(keyId: string): Promise<KrapiResponse> {
    return this.client.request("admin", "keys", "delete", { keyId });
  }

  // Database Stats
  async getDatabaseStats(): Promise<KrapiResponse<DatabaseStats>> {
    return this.client.request("admin", "database", "stats");
  }

  // Project Stats
  async getProjectStats(projectId: string): Promise<KrapiResponse<unknown>> {
    return this.client.request("admin", "projects", "stats", { projectId });
  }

  // Health Check
  async health(): Promise<KrapiResponse> {
    return this.client.health();
  }

  // Dashboard Stats - aggregates data from various sources
  async getStats(): Promise<
    KrapiResponse<{
      projects: { total: number };
      users: { active: number };
      database: { collections: number };
      storage: { used: number };
    }>
  > {
    try {
      // Fetch projects
      const projectsResponse = await this.listProjects();
      const totalProjects = projectsResponse.success
        ? projectsResponse.data?.length || 0
        : 0;

      // Fetch database stats
      const dbStatsResponse = await this.getDatabaseStats();
      const collections = dbStatsResponse.success
        ? dbStatsResponse.data?.collections || 0
        : 0;

      // Fetch API stats for user activity
      const apiStatsResponse = await this.getApiStats();
      const activeUsers = apiStatsResponse.success
        ? typeof apiStatsResponse.data?.activeUsers === "number"
          ? apiStatsResponse.data.activeUsers
          : 0
        : 0;

      // For storage, we'll need to implement this or use a placeholder
      // This might need to be implemented in the backend
      const storageUsed = 0; // Placeholder - needs backend implementation

      return Promise.resolve({
        success: true,
        data: {
          projects: { total: totalProjects },
          users: { active: activeUsers },
          database: { collections },
          storage: { used: storageUsed },
        },
      });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        data: {
          projects: { total: 0 },
          users: { active: 0 },
          database: { collections: 0 },
          storage: { used: 0 },
        },
      });
    }
  }

  // Activity Log
  async getActivity(params?: {
    limit?: number;
  }): Promise<KrapiResponse<unknown[]>> {
    return this.client.request("admin", "activity", "list", params);
  }

  // API Keys management
  async getApiKeys(): Promise<KrapiResponse<ProjectApiKey[]>> {
    return this.client.request("admin", "keys", "list");
  }

  async getEndpoints(): Promise<KrapiResponse<Record<string, unknown>[]>> {
    return this.client.request("admin", "endpoints", "list");
  }

  async getRateLimits(): Promise<KrapiResponse<Record<string, unknown>>> {
    return this.client.request("admin", "rate-limits", "get");
  }

  async getApiStats(): Promise<KrapiResponse<Record<string, unknown>>> {
    return this.client.request("admin", "api", "stats");
  }

  async updateApiKey(
    keyId: string,
    updates: Partial<ProjectApiKey>
  ): Promise<KrapiResponse<ProjectApiKey>> {
    return this.client.request("admin", "keys", "update", {
      keyId,
      ...updates,
    });
  }
}

// Create admin instance from client
export function createKrapiAdmin(client: KrapiClient): KrapiAdmin {
  return new KrapiAdmin(client);
}
