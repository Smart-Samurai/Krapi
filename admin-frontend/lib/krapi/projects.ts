import KrapiClient, { KrapiResponse } from "./client";
import { Project, ProjectStats, ProjectApiKey } from "./types";

export class KrapiProjects {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Get project by ID
  async getById(projectId: string): Promise<KrapiResponse<Project>> {
    return this.client.request("projects", "get", "byId", { projectId });
  }

  // Get project stats
  async getStats(projectId: string): Promise<KrapiResponse<ProjectStats>> {
    return this.client.request("projects", "stats", "get", { projectId });
  }

  // Get project API keys
  async getApiKeys(projectId: string): Promise<KrapiResponse<ProjectApiKey[]>> {
    return this.client.request("projects", "keys", "list", { projectId });
  }

  // Create project API key
  async createApiKey(
    projectId: string,
    keyData: {
      name: string;
      permissions?: string[];
      expiresAt?: string;
    }
  ): Promise<KrapiResponse<ProjectApiKey>> {
    return this.client.request("projects", "keys", "create", {
      projectId,
      ...keyData,
    });
  }

  // Delete project API key
  async deleteApiKey(projectId: string, keyId: string): Promise<KrapiResponse> {
    return this.client.request("projects", "keys", "delete", {
      projectId,
      keyId,
    });
  }
}

// Create projects instance from client
export function createKrapiProjects(client: KrapiClient): KrapiProjects {
  return new KrapiProjects(client);
}
