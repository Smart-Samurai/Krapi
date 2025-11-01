import { ISystemService, ApiResponse } from "./interfaces";
import {
  SystemSettings,
  SystemInfo,
  DatabaseHealth,
  EmailConfig,
} from "./types";

export class SystemService implements ISystemService {
  constructor(private baseURL: string, private sessionToken?: string) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Handle different header types
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (typeof options.headers === "object") {
        Object.assign(headers, options.headers);
      }
    }

    if (this.sessionToken) {
      headers.Authorization = `Bearer ${this.sessionToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? ((data as Record<string, unknown>).error as string)
            : `HTTP ${response.status}: ${response.statusText}`;
        return {
          success: false,
          error: message,
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async getSettings(): Promise<ApiResponse<SystemSettings>> {
    return this.request<SystemSettings>("/krapi/k1/system/settings");
  }

  async updateSettings(
    updates: Partial<SystemSettings>
  ): Promise<ApiResponse<SystemSettings>> {
    return this.request<SystemSettings>("/krapi/k1/system/settings", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async testEmailConfig(
    config: EmailConfig
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>("/krapi/k1/system/test-email", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    return this.request<SystemInfo>("/krapi/k1/system/info");
  }

  async getDatabaseHealth(): Promise<ApiResponse<DatabaseHealth>> {
    return this.request<DatabaseHealth>("/krapi/k1/system/database-health");
  }
}
