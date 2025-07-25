import axios, { AxiosInstance } from "axios";

export interface KrapiConfig {
  endpoint: string;
  apiKey?: string;
  secret?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface KrapiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class KrapiClient {
  private config: KrapiConfig;
  private axiosInstance: AxiosInstance;

  constructor(config: KrapiConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use((config) => {
      // Add API key if provided
      if (this.config.apiKey) {
        config.headers["X-API-Key"] = this.config.apiKey;
      }

      // Add secret if provided
      if (this.config.secret) {
        config.headers["X-API-Secret"] = this.config.secret;
      }

      // Add auth token from localStorage if available (for admin operations)
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token && !config.url?.includes("/auth")) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    });

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Make a unified API request
  async request<T = any>(
    operation: string,
    resource: string,
    action: string,
    params?: Record<string, any>
  ): Promise<KrapiResponse<T>> {
    try {
      const response = await this.axiosInstance.post("/api", {
        operation,
        resource,
        action,
        params,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Unknown error",
      };
    }
  }

  // Health check
  async health(): Promise<KrapiResponse> {
    try {
      const response = await this.axiosInstance.get("/health");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.error || error.message || "Health check failed",
      };
    }
  }

  // Get the axios instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  // Update configuration
  updateConfig(newConfig: Partial<KrapiConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Update axios instance
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    this.axiosInstance.defaults.timeout = this.config.timeout;

    // Re-setup interceptors with new config
    this.setupInterceptors();
  }
}

export default KrapiClient;
