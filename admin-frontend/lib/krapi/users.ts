import KrapiClient, { KrapiResponse } from "./client";
import { ProjectUser } from "./types";

export class KrapiUsers {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // List project users
  async listUsers(projectId: string): Promise<KrapiResponse<ProjectUser[]>> {
    return this.client.request("users", "list", "list", { projectId });
  }

  // Get all users (admin function)
  async getAllUsers(
    filters?: Record<string, unknown>
  ): Promise<KrapiResponse<ProjectUser[]>> {
    return this.client.request("admin", "users", "list", filters);
  }

  // Get user by ID
  async getUser(userId: string): Promise<KrapiResponse<ProjectUser>> {
    return this.client.request("users", "get", "get", { userId });
  }

  // Create user
  async createUser(userData: {
    projectId: string;
    email: string;
    username: string;
    role: "admin" | "editor" | "viewer";
    permissions?: string[];
  }): Promise<KrapiResponse<ProjectUser>> {
    return this.client.request("users", "create", "create", userData);
  }

  // Update user
  async updateUser(
    userId: string,
    updates: Partial<ProjectUser>
  ): Promise<KrapiResponse<ProjectUser>> {
    return this.client.request("users", "update", "update", {
      userId,
      ...updates,
    });
  }

  // Delete user
  async deleteUser(userId: string): Promise<KrapiResponse> {
    return this.client.request("users", "delete", "delete", { userId });
  }

  // Get user by email
  async getUserByEmail(
    projectId: string,
    email: string
  ): Promise<KrapiResponse<ProjectUser>> {
    return this.client.request("users", "getByEmail", "get", {
      projectId,
      email,
    });
  }
}

// Create users instance from client
export function createKrapiUsers(client: KrapiClient): KrapiUsers {
  return new KrapiUsers(client);
}
