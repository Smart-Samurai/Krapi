/**
 * Base HTTP Client for KRAPI SDK
 * 
 * Provides common HTTP functionality that all service clients extend.
 * Handles authentication, request/response interceptors, and common HTTP methods.
 * 
 * @module http-clients/base-http-client
 * @example
 * class MyServiceClient extends BaseHttpClient {
 *   async getData() {
 *     return this.get('/endpoint');
 *   }
 * }
 */
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

import { ApiResponse, PaginatedResponse, QueryOptions } from "../core";

/**
 * HTTP Client Configuration
 * 
 * @interface HttpClientConfig
 * @property {string} baseUrl - Base URL for API requests
 * @property {string} [apiKey] - API key for authentication
 * @property {string} [sessionToken] - Session token for authentication
 * @property {number} [timeout] - Request timeout in milliseconds
 */
export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;
}

/**
 * Base HTTP Client Class
 * 
 * Base class for all HTTP client implementations.
 * Provides common HTTP methods (GET, POST, PUT, DELETE) and authentication handling.
 * 
 * @class BaseHttpClient
 * @example
 * const client = new BaseHttpClient({ baseUrl: 'https://api.example.com' });
 * await client.initializeClient();
 * const response = await client.get('/endpoint');
 */
export class BaseHttpClient {
  protected baseUrl: string;
  protected apiKey?: string;
  protected sessionToken?: string;
  protected httpClient: AxiosInstance;

  /**
   * Create a new BaseHttpClient instance
   * 
   * @param {HttpClientConfig} config - HTTP client configuration
   */
  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.sessionToken) this.sessionToken = config.sessionToken;
  }

  /**
   * Initialize the HTTP client with interceptors
   * 
   * Sets up axios instance with authentication interceptors and error handling.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await client.initializeClient();
   */
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

  /**
   * Set session token for authentication
   * 
   * @param {string} token - Session token
   * @returns {void}
   * 
   * @example
   * client.setSessionToken('session-token-here');
   */
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

  /**
   * Set API key for authentication
   * 
   * @param {string} key - API key
   * @returns {void}
   * 
   * @example
   * client.setApiKey('api-key-here');
   */
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

  /**
   * Clear authentication credentials
   * 
   * Removes both session token and API key.
   * 
   * @returns {void}
   * 
   * @example
   * client.clearAuth();
   */
  clearAuth() {
    delete this.sessionToken;
    delete this.apiKey;
  }

  /**
   * Send GET request
   * 
   * @template T
   * @param {string} endpoint - API endpoint
   * @param {QueryOptions} [params] - Query parameters
   * @returns {Promise<ApiResponse<T>>} API response
   * 
   * @example
   * const response = await client.get('/projects', { limit: 10 });
   */
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
