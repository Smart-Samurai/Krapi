/**
 * Base HTTP Client for KRAPI SDK
 *
 * Provides common HTTP functionality that all service clients extend
 */

import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

import { ApiResponse, PaginatedResponse, QueryOptions } from "../core";

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;
}

export class BaseHttpClient {
  protected baseUrl: string;
  protected apiKey?: string;
  protected sessionToken?: string;
  protected httpClient: AxiosInstance;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.sessionToken) this.sessionToken = config.sessionToken;
  }

  async initializeClient() {
    if (this.httpClient) return; // Already initialized

    this.httpClient = axios.create({
      baseURL: `${this.baseUrl}/krapi/k1`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.sessionToken) {
          config.headers.Authorization = `Bearer ${this.sessionToken}`;
        } else if (this.apiKey) {
          config.headers["X-API-Key"] = this.apiKey;
        }
        return config;
      }
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => response.data, // Return just the data
      (error: unknown) => {
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response: {
              status: number;
              data: { error?: string; message?: string };
            };
            message?: string;
          };
          const { status, data } = axiosError.response;
          const enhancedError = {
            ...error,
            message: data?.error || data?.message || axiosError.message,
            status,
            isApiError: true,
            originalError: error,
          };
          return Promise.reject(enhancedError);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  setSessionToken(token: string) {
    this.sessionToken = token;
    delete this.apiKey;
  }

  setApiKey(key: string) {
    this.apiKey = key;
    delete this.sessionToken;
  }

  clearAuth() {
    delete this.sessionToken;
    delete this.apiKey;
  }

  // Common HTTP methods
  protected async get<T>(
    endpoint: string,
    params?: QueryOptions
  ): Promise<ApiResponse<T>> {
    await this.initializeClient();
    return this.httpClient.get(endpoint, { params });
  }

  protected async post<T>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    await this.initializeClient();
    return this.httpClient.post(endpoint, data);
  }

  protected async put<T>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    await this.initializeClient();
    return this.httpClient.put(endpoint, data);
  }

  protected async patch<T>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    await this.initializeClient();
    return this.httpClient.patch(endpoint, data);
  }

  protected async delete<T>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    await this.initializeClient();
    return this.httpClient.delete(endpoint, { data });
  }

  // Utility method to build query strings
  protected buildQueryString(params: Record<string, unknown>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return query.toString();
  }

  // Handle paginated responses
  protected async getPaginated<T>(
    endpoint: string,
    params?: QueryOptions & { page?: number }
  ): Promise<PaginatedResponse<T>> {
    await this.initializeClient();
    return this.httpClient.get(endpoint, { params });
  }
}
