import { ISystemService, ApiResponse } from "./interfaces";
import {
  SystemSettings,
  SystemInfo,
  DatabaseHealth,
  EmailConfig,
} from "./types";

/**
 * System Service
 * 
 * Provides system settings and information management.
 * 
 * @class SystemService
 * @implements {ISystemService}
 * @example
 * const systemService = new SystemService(baseURL, sessionToken);
 * const settings = await systemService.getSettings();
 */
export class SystemService implements ISystemService {
  /**
   * Create a new SystemService instance
   * 
   * @param {string} baseURL - Base URL for API requests
   * @param {string} [sessionToken] - Session token for authentication
   */
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

  /**
   * Get system settings
   * 
   * @returns {Promise<ApiResponse<SystemSettings>>} System settings
   * 
   * @example
   * const result = await systemService.getSettings();
   * if (result.success) {
   *   console.log('Settings:', result.data);
   * }
   */
  /**
   * Get system settings
   * 
   * @returns {Promise<ApiResponse<SystemSettings>>} System settings
   * 
   * @example
   * const result = await systemService.getSettings();
   * if (result.success) {
   *   console.log('Settings:', result.data);
   * }
   */
  async getSettings(): Promise<ApiResponse<SystemSettings>> {
    return this.request<SystemSettings>("/krapi/k1/system/settings");
  }

  /**
   * Update system settings
   * 
   * @param {Partial<SystemSettings>} updates - Settings updates
   * @returns {Promise<ApiResponse<SystemSettings>>} Updated settings
   * 
   * @example
   * const result = await systemService.updateSettings({ debug_mode: true });
   */
  async updateSettings(
    updates: Partial<SystemSettings>
  ): Promise<ApiResponse<SystemSettings>> {
    return this.request<SystemSettings>("/krapi/k1/system/settings", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Test email configuration
   * 
   * @param {EmailConfig} config - Email configuration to test
   * @returns {Promise<ApiResponse<{ success: boolean }>>} Test result
   * 
   * @example
   * const result = await systemService.testEmailConfig(emailConfig);
   */
  async testEmailConfig(
    config: EmailConfig
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>("/krapi/k1/system/test-email", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  /**
   * Get system information
   * 
   * @returns {Promise<ApiResponse<SystemInfo>>} System information
   * 
   * @example
   * const result = await systemService.getSystemInfo();
   */
  async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    return this.request<SystemInfo>("/krapi/k1/system/info");
  }

  /**
   * Get database health status
   * 
   * @returns {Promise<ApiResponse<DatabaseHealth>>} Database health status
   * 
   * @example
   * const result = await systemService.getDatabaseHealth();
   */
  async getDatabaseHealth(): Promise<ApiResponse<DatabaseHealth>> {
    return this.request<DatabaseHealth>("/krapi/k1/system/database-health");
  }
}
