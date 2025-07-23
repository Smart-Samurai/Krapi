import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { errorHandler } from "./error-handler";
import { config } from "./config";

// Enhanced API client with verbose error handling
export class EnhancedApiClient {
  private axiosInstance: AxiosInstance;
  private requestId = 0;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.api.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: config.api.timeout,
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = ++this.requestId;

        // Add auth token
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("auth_token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Log request details
        console.log(`📤 API Request [${requestId}]:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          headers: config.headers,
          data: config.data,
          params: config.params,
          timestamp: new Date().toISOString(),
        });

        // Store request ID for response tracking
        (config as any).requestId = requestId;

        return config;
      },
      (error) => {
        console.error("❌ Request Interceptor Error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = (response.config as any).requestId;

        console.log(`📥 API Response [${requestId}]:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          data: response.data,
          headers: response.headers,
          timestamp: new Date().toISOString(),
        });

        return response;
      },
      (error) => {
        const requestId = (error.config as any)?.requestId;

        console.error(`❌ API Response Error [${requestId}]:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data,
          timestamp: new Date().toISOString(),
        });

        return Promise.reject(error);
      }
    );
  }

  // Generic request method with enhanced error handling
  async request<T = any>(
    config: AxiosRequestConfig,
    context: {
      component: string;
      function: string;
      endpoint?: string;
      method?: string;
      params?: Record<string, unknown>;
    }
  ): Promise<T> {
    return errorHandler.handleApiCall(
      () => this.axiosInstance.request(config),
      context.component,
      context.function,
      context.endpoint,
      context.method,
      context.params,
      config.data
    );
  }

  // GET request
  async get<T = any>(
    url: string,
    context: {
      component: string;
      function: string;
      endpoint?: string;
      method?: string;
      params?: Record<string, unknown>;
    },
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request(
      { ...config, method: "GET", url },
      {
        ...context,
        endpoint: url,
        method: "GET",
      }
    );
  }

  // POST request
  async post<T = any>(
    url: string,
    context: {
      component: string;
      function: string;
      params?: Record<string, unknown>;
    },
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request(
      { ...config, method: "POST", url, data },
      {
        ...context,
        endpoint: url,
        method: "POST",
      }
    );
  }

  // PUT request
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    context: {
      component: string;
      function: string;
      params?: Record<string, unknown>;
    }
  ): Promise<T> {
    return this.request(
      { ...config, method: "PUT", url, data },
      {
        ...context,
        endpoint: url,
        method: "PUT",
      }
    );
  }

  // DELETE request
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    context: {
      component: string;
      function: string;
      params?: Record<string, unknown>;
    }
  ): Promise<T> {
    return this.request(
      { ...config, method: "DELETE", url },
      {
        ...context,
        endpoint: url,
        method: "DELETE",
      }
    );
  }

  // PATCH request
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    context: {
      component: string;
      function: string;
      params?: Record<string, unknown>;
    }
  ): Promise<T> {
    return this.request(
      { ...config, method: "PATCH", url, data },
      {
        ...context,
        endpoint: url,
        method: "PATCH",
      }
    );
  }
}

// Create singleton instance
export const enhancedApi = new EnhancedApiClient();

// Enhanced API functions with verbose error handling
export const enhancedHealthAPI = {
  check: async () => {
    return enhancedApi.get("/health", {
      component: "HealthAPI",
      function: "check",
      endpoint: "/health",
    });
  },
};

export const enhancedContentAPI = {
  getAllContent: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    return enhancedApi.get(`/admin/content/get?${params.toString()}`, {
      component: "ContentAPI",
      function: "getAllContent",
      endpoint: "/admin/content/get",
      params: filters,
    });
  },

  getContentById: async (id: number) => {
    return enhancedApi.get(
      `/admin/content/get/${id}`,
      {},
      {
        component: "ContentAPI",
        function: "getContentById",
        endpoint: `/admin/content/get/${id}`,
        params: { id },
      }
    );
  },

  createContent: async (data: any) => {
    return enhancedApi.post(
      "/admin/content/create",
      data,
      {},
      {
        component: "ContentAPI",
        function: "createContent",
        endpoint: "/admin/content/create",
        params: { data },
      }
    );
  },

  updateContent: async (id: number, data: any) => {
    return enhancedApi.put(
      `/admin/content/modify/id/${id}`,
      data,
      {},
      {
        component: "ContentAPI",
        function: "updateContent",
        endpoint: `/admin/content/modify/id/${id}`,
        params: { id, data },
      }
    );
  },

  deleteContent: async (id: number) => {
    return enhancedApi.delete(
      `/admin/content/delete/id/${id}`,
      {},
      {
        component: "ContentAPI",
        function: "deleteContent",
        endpoint: `/admin/content/delete/id/${id}`,
        params: { id },
      }
    );
  },
};

export const enhancedRoutesAPI = {
  getAllRoutes: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    return enhancedApi.get(
      `/admin/routes?${params.toString()}`,
      {},
      {
        component: "RoutesAPI",
        function: "getAllRoutes",
        endpoint: "/admin/routes",
        params: filters,
      }
    );
  },

  getRouteById: async (id: number) => {
    return enhancedApi.get(
      `/admin/routes/${id}`,
      {},
      {
        component: "RoutesAPI",
        function: "getRouteById",
        endpoint: `/admin/routes/${id}`,
        params: { id },
      }
    );
  },

  createRoute: async (route: any) => {
    return enhancedApi.post(
      "/admin/routes",
      route,
      {},
      {
        component: "RoutesAPI",
        function: "createRoute",
        endpoint: "/admin/routes",
        params: { route },
      }
    );
  },

  updateRoute: async (id: number, route: any) => {
    return enhancedApi.put(
      `/admin/routes/${id}`,
      route,
      {},
      {
        component: "RoutesAPI",
        function: "updateRoute",
        endpoint: `/admin/routes/${id}`,
        params: { id, route },
      }
    );
  },

  deleteRoute: async (id: number) => {
    return enhancedApi.delete(
      `/admin/routes/${id}`,
      {},
      {
        component: "RoutesAPI",
        function: "deleteRoute",
        endpoint: `/admin/routes/${id}`,
        params: { id },
      }
    );
  },
};

export const enhancedFilesAPI = {
  getAllFiles: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    return enhancedApi.get(
      `/admin/files?${params.toString()}`,
      {},
      {
        component: "FilesAPI",
        function: "getAllFiles",
        endpoint: "/admin/files",
        params: filters,
      }
    );
  },

  getFileById: async (id: number) => {
    return enhancedApi.get(
      `/admin/files/${id}`,
      {},
      {
        component: "FilesAPI",
        function: "getFileById",
        endpoint: `/admin/files/${id}`,
        params: { id },
      }
    );
  },

  uploadFile: async (
    file: File,
    description?: string,
    access_level?: string
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }
    if (access_level) {
      formData.append("access_level", access_level);
    }

    return enhancedApi.post(
      "/admin/files/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      {
        component: "FilesAPI",
        function: "uploadFile",
        endpoint: "/admin/files/upload",
        params: { description, access_level },
      }
    );
  },

  deleteFile: async (id: number) => {
    return enhancedApi.delete(
      `/admin/files/${id}`,
      {},
      {
        component: "FilesAPI",
        function: "deleteFile",
        endpoint: `/admin/files/${id}`,
        params: { id },
      }
    );
  },
};

export const enhancedUsersAPI = {
  getAllUsers: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    return enhancedApi.get(
      `/admin/users?${params.toString()}`,
      {},
      {
        component: "UsersAPI",
        function: "getAllUsers",
        endpoint: "/admin/users",
        params: filters,
      }
    );
  },

  getUserById: async (id: number) => {
    return enhancedApi.get(
      `/admin/users/${id}`,
      {},
      {
        component: "UsersAPI",
        function: "getUserById",
        endpoint: `/admin/users/${id}`,
        params: { id },
      }
    );
  },

  createUser: async (user: any) => {
    return enhancedApi.post(
      "/admin/users",
      user,
      {},
      {
        component: "UsersAPI",
        function: "createUser",
        endpoint: "/admin/users",
        params: { user },
      }
    );
  },

  updateUser: async (id: number, user: any) => {
    return enhancedApi.put(
      `/admin/users/${id}`,
      user,
      {},
      {
        component: "UsersAPI",
        function: "updateUser",
        endpoint: `/admin/users/${id}`,
        params: { id, user },
      }
    );
  },

  deleteUser: async (id: number) => {
    return enhancedApi.delete(
      `/admin/users/${id}`,
      {},
      {
        component: "UsersAPI",
        function: "deleteUser",
        endpoint: `/admin/users/${id}`,
        params: { id },
      }
    );
  },
};

// Export the enhanced API instance
export default enhancedApi;
