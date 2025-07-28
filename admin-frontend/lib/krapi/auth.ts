import KrapiClient, { KrapiResponse } from "./client";
import { AuthUser, LoginResponse } from "./types";

export class KrapiAuth {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Login with username and password
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.client.getAxiosInstance().post("/auth", {
        method: "login",
        username,
        password,
      });
      
      const data = response.data;
      
      // Store auth data if login successful
      if (data.success && data.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", data.token);
          if (data.user) {
            localStorage.setItem("auth_user", JSON.stringify(data.user));
          }
        }
      }
      
      return data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      const responseError = (
        error as { response?: { data?: { error?: string; message?: string } } }
      )?.response?.data;
      
      return {
        success: false,
        error: responseError?.error || responseError?.message || errorMessage || "Login failed"
      };
    }
  }

  // Verify current token
  async verify(): Promise<KrapiResponse<AuthUser>> {
    try {
      const response = await this.client.getAxiosInstance().post("/auth", {
        method: "verify",
      });
      return response.data;
    } catch (error: unknown) {
      // Throw the error instead of returning a failed response
      const errorMessage =
        error instanceof Error ? error.message : "Token verification failed";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(
        responseError || errorMessage || "Token verification failed"
      );
    }
  }

  // Logout (clear local token)
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }

  // Get current user from localStorage
  getCurrentUser(): AuthUser | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("auth_user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("auth_token");
    }
    return false;
  }

  // Get auth token
  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  // Set auth data (used internally after login)
  setAuthData(token: string, user: AuthUser): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
  }

  // Admin user management methods
  async getAllUsers(): Promise<KrapiResponse<AuthUser[]>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "list",
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get users";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(responseError || errorMessage || "Failed to get users");
    }
  }

  // Get users with pagination
  async getUsers(
    page: number,
    limit: number
  ): Promise<KrapiResponse<AuthUser[]>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "list",
        params: { page, limit },
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get users";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(responseError || errorMessage || "Failed to get users");
    }
  }

  // Get user statistics
  async getUserStats(): Promise<KrapiResponse<Record<string, unknown>>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "stats",
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get user stats";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(
        responseError || errorMessage || "Failed to get user stats"
      );
    }
  }

  // Get security settings
  async getSecuritySettings(): Promise<KrapiResponse<Record<string, unknown>>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "security",
        action: "get",
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get security settings";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(
        responseError || errorMessage || "Failed to get security settings"
      );
    }
  }

  // Get sessions
  async getSessions(
    filters?: Record<string, unknown>
  ): Promise<KrapiResponse<Record<string, unknown>[]>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "sessions",
        action: "list",
        params: filters,
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get sessions";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(
        responseError || errorMessage || "Failed to get sessions"
      );
    }
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: "admin" | "user";
  }): Promise<KrapiResponse<AuthUser>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "create",
        params: userData,
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(responseError || errorMessage || "Failed to create user");
    }
  }

  async updateUser(
    userId: number,
    updates: Partial<AuthUser>
  ): Promise<KrapiResponse<AuthUser>> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "update",
        params: { id: userId, ...updates },
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(responseError || errorMessage || "Failed to update user");
    }
  }

  async deleteUser(userId: number): Promise<KrapiResponse> {
    try {
      const response = await this.client.getAxiosInstance().post("/api", {
        operation: "admin",
        resource: "users",
        action: "delete",
        params: { id: userId },
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      const responseError = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      throw new Error(responseError || errorMessage || "Failed to delete user");
    }
  }
}

// Create auth instance from client
export function createKrapiAuth(client: KrapiClient): KrapiAuth {
  return new KrapiAuth(client);
}
