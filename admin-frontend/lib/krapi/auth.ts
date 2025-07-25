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
      console.log(
        "🔐 KrapiAuth: Making login request to:",
        this.client.getAxiosInstance().defaults.baseURL + "/auth"
      );
      const response = await this.client.getAxiosInstance().post("/auth", {
        method: "login",
        username,
        password,
      });
      console.log("🔐 KrapiAuth: Raw response:", response.data);
      return response.data;
    } catch (error: any) {
      console.log("🔐 KrapiAuth: Login error:", error);
      console.log("🔐 KrapiAuth: Error response:", error.response?.data);
      // Throw the error instead of returning a failed response
      throw new Error(
        error.response?.data?.error || error.message || "Login failed"
      );
    }
  }

  // Verify current token
  async verify(): Promise<KrapiResponse<AuthUser>> {
    try {
      const response = await this.client.getAxiosInstance().post("/auth", {
        method: "verify",
      });
      return response.data;
    } catch (error: any) {
      // Throw the error instead of returning a failed response
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Token verification failed"
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
}

// Create auth instance from client
export function createKrapiAuth(client: KrapiClient): KrapiAuth {
  return new KrapiAuth(client);
}
