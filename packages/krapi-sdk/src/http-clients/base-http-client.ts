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
    // Use a closure to always read the latest token values
    this.httpClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Always read from instance properties to get the latest values
        if (this.sessionToken) {
          config.headers.Authorization = `Bearer ${this.sessionToken}`;
          // Remove API key header if session token is set
          delete config.headers["X-API-Key"];
        } else if (this.apiKey) {
          config.headers["X-API-Key"] = this.apiKey;
          // Remove Authorization header if API key is set
          delete config.headers.Authorization;
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
          const errorMessage = data?.error || data?.message || axiosError.message;
          const enhancedError = {
            ...error,
            message: errorMessage,
            status,
            isApiError: true,
            originalError: error,
            // Add flag for auth errors to help frontend detect them
            isAuthError: status === 401 || 
              (typeof errorMessage === 'string' && (
                errorMessage.includes('expired') ||
                errorMessage.includes('Invalid') ||
                errorMessage.includes('Unauthorized') ||
                errorMessage.includes('log in again')
              )),
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
    // Update axios instance if it exists
    // The interceptor will read from this.sessionToken, so we don't need to update defaults
    // But we'll update them anyway for consistency
    if (this.httpClient) {
      this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      delete this.httpClient.defaults.headers.common["X-API-Key"];
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    delete this.sessionToken;
    // Update axios instance if it exists
    // The interceptor will read from this.apiKey, so we don't need to update defaults
    // But we'll update them anyway for consistency
    if (this.httpClient) {
      this.httpClient.defaults.headers.common["X-API-Key"] = key;
      delete this.httpClient.defaults.headers.common["Authorization"];
    }
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
