import { Project, ProjectApiKey, DatabaseStats } from "./types";
import KrapiClient from "./client";
import {
  KrapiResponse,
  User,
  PaginatedResponse,
  QueryOptions,
} from "./types";

export interface KrapiAdmin {
  // User management
  getUsers(options?: QueryOptions): Promise<PaginatedResponse<User>>;
  getUser(userId: string): Promise<KrapiResponse<User>>;
  createUser(userData: Partial<User>): Promise<KrapiResponse<User>>;
  updateUser(userId: string, userData: Partial<User>): Promise<KrapiResponse<User>>;
  deleteUser(userId: string): Promise<KrapiResponse>;
  toggleUserStatus(userId: string): Promise<KrapiResponse<User>>;
  getUserActivity(userId: string): Promise<KrapiResponse<unknown>>;
  
  // Health Check
  health(): Promise<KrapiResponse>;
}

export function createKrapiAdmin(client: KrapiClient): KrapiAdmin {
  return {
    // User management
    async getUsers(options?: QueryOptions): Promise<PaginatedResponse<User>> {
      return client.request("admin", "users", "list", options);
    },

    async getUser(userId: string): Promise<KrapiResponse<User>> {
      return client.request("admin", "users", "get", { userId });
    },

    async createUser(userData: Partial<User>): Promise<KrapiResponse<User>> {
      return client.request("admin", "users", "create", userData);
    },

    async updateUser(
      userId: string,
      userData: Partial<User>
    ): Promise<KrapiResponse<User>> {
      return client.request("admin", "users", "update", { userId, ...userData });
    },

    async deleteUser(userId: string): Promise<KrapiResponse> {
      return client.request("admin", "users", "delete", { userId });
    },

    async toggleUserStatus(userId: string): Promise<KrapiResponse<User>> {
      return client.request("admin", "users", "toggle-status", { userId });
    },

    async getUserActivity(userId: string): Promise<KrapiResponse<unknown>> {
      return client.request("admin", "users", "activity", { userId });
    },

    // Health Check
    async health(): Promise<KrapiResponse> {
      return client.health();
    },
  };
}
