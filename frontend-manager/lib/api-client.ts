/**
 * Client-side API service for interacting with Next.js API routes
 * This service wraps fetch calls and handles authentication
 */

import { 
  ApiResponse, 
  PaginatedResponse, 
  AdminUser, 
  Project, 
  TableSchema, 
  Document, 
  FileInfo,
  QueryOptions 
} from '@/lib/krapi-sdk/types';

class ApiClient {
  private baseUrl = '/api';

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  auth = {
    login: async (email: string, password: string) => {
      const response = await this.request<ApiResponse<{
        user: Omit<AdminUser, 'password_hash'>;
        token: string;
        session_token: string;
        expires_at: string;
      }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Store token if login successful
      if (response.success && response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      return response;
    },

    logout: async () => {
      const response = await this.request<ApiResponse>('/auth/logout', {
        method: 'POST',
      });

      // Clear token on logout
      localStorage.removeItem('auth_token');

      return response;
    },

    getCurrentUser: async () => {
      return this.request<ApiResponse<Omit<AdminUser, 'password_hash'>>>('/auth/me');
    },
  };

  // Admin endpoints
  admin = {
    getUsers: async (options?: QueryOptions) => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.sort) params.append('sort', options.sort);
      if (options?.order) params.append('order', options.order);
      if (options?.search) params.append('search', options.search);

      return this.request<PaginatedResponse<Omit<AdminUser, 'password_hash'>>>(
        `/admin/users${params.toString() ? `?${params.toString()}` : ''}`
      );
    },

    getUserById: async (id: string) => {
      return this.request<ApiResponse<Omit<AdminUser, 'password_hash'>>>(
        `/admin/users/${id}`
      );
    },

    createUser: async (userData: {
      email: string;
      username: string;
      password: string;
      role: string;
      access_level: string;
      permissions?: any[];
    }) => {
      return this.request<ApiResponse<Omit<AdminUser, 'password_hash'>>>(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify(userData),
        }
      );
    },

    updateUser: async (id: string, updates: Partial<AdminUser>) => {
      return this.request<ApiResponse<Omit<AdminUser, 'password_hash'>>>(
        `/admin/users/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
    },

    deleteUser: async (id: string) => {
      return this.request<ApiResponse>(`/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Projects endpoints
  projects = {
    getAll: async (options?: QueryOptions) => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.sort) params.append('sort', options.sort);
      if (options?.order) params.append('order', options.order);
      if (options?.search) params.append('search', options.search);

      return this.request<PaginatedResponse<Project>>(
        `/projects${params.toString() ? `?${params.toString()}` : ''}`
      );
    },

    getById: async (id: string) => {
      return this.request<ApiResponse<Project>>(`/projects/${id}`);
    },

    create: async (projectData: {
      name: string;
      description?: string;
      settings?: any;
    }) => {
      return this.request<ApiResponse<Project>>('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });
    },

    update: async (id: string, updates: Partial<Project>) => {
      return this.request<ApiResponse<Project>>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string) => {
      return this.request<ApiResponse>(`/projects/${id}`, {
        method: 'DELETE',
      });
    },

    getStats: async (id: string) => {
      return this.request<ApiResponse<any>>(`/projects/${id}/stats`);
    },

    regenerateApiKey: async (id: string) => {
      return this.request<ApiResponse<{ api_key: string }>>(
        `/projects/${id}/regenerate-api-key`,
        {
          method: 'POST',
        }
      );
    },
  };

  // Database endpoints
  database = {
    getSchemas: async (projectId: string) => {
      return this.request<ApiResponse<TableSchema[]>>(
        `/database/${projectId}/schemas`
      );
    },

    getSchema: async (projectId: string, tableName: string) => {
      return this.request<ApiResponse<TableSchema>>(
        `/database/${projectId}/schemas/${tableName}`
      );
    },

    createSchema: async (
      projectId: string,
      schema: {
        name: string;
        description?: string;
        fields: any[];
        indexes?: any[];
      }
    ) => {
      return this.request<ApiResponse<TableSchema>>(
        `/database/${projectId}/schemas`,
        {
          method: 'POST',
          body: JSON.stringify(schema),
        }
      );
    },

    updateSchema: async (
      projectId: string,
      tableName: string,
      updates: Partial<TableSchema>
    ) => {
      return this.request<ApiResponse<TableSchema>>(
        `/database/${projectId}/schemas/${tableName}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
    },

    deleteSchema: async (projectId: string, tableName: string) => {
      return this.request<ApiResponse>(
        `/database/${projectId}/schemas/${tableName}`,
        {
          method: 'DELETE',
        }
      );
    },

    getDocuments: async (
      projectId: string,
      tableName: string,
      options?: QueryOptions
    ) => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.sort) params.append('sort', options.sort);
      if (options?.order) params.append('order', options.order);
      if (options?.search) params.append('search', options.search);

      return this.request<PaginatedResponse<Document>>(
        `/database/${projectId}/${tableName}/documents${
          params.toString() ? `?${params.toString()}` : ''
        }`
      );
    },

    getDocument: async (
      projectId: string,
      tableName: string,
      documentId: string
    ) => {
      return this.request<ApiResponse<Document>>(
        `/database/${projectId}/${tableName}/documents/${documentId}`
      );
    },

    createDocument: async (
      projectId: string,
      tableName: string,
      data: any
    ) => {
      return this.request<ApiResponse<Document>>(
        `/database/${projectId}/${tableName}/documents`,
        {
          method: 'POST',
          body: JSON.stringify({ data }),
        }
      );
    },

    updateDocument: async (
      projectId: string,
      tableName: string,
      documentId: string,
      data: any
    ) => {
      return this.request<ApiResponse<Document>>(
        `/database/${projectId}/${tableName}/documents/${documentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ data }),
        }
      );
    },

    deleteDocument: async (
      projectId: string,
      tableName: string,
      documentId: string
    ) => {
      return this.request<ApiResponse>(
        `/database/${projectId}/${tableName}/documents/${documentId}`,
        {
          method: 'DELETE',
        }
      );
    },
  };

  // Storage endpoints
  storage = {
    getFiles: async (projectId: string) => {
      return this.request<ApiResponse<FileInfo[]>>(
        `/storage/${projectId}/files`
      );
    },

    getFileInfo: async (projectId: string, fileId: string) => {
      return this.request<ApiResponse<FileInfo>>(
        `/storage/${projectId}/files/${fileId}`
      );
    },

    uploadFile: async (
      projectId: string,
      file: File | Blob,
      onProgress?: (progress: number) => void
    ) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Note: Don't set Content-Type for FormData, let browser set it
      const response = await fetch(`${this.baseUrl}/storage/${projectId}/files`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data as ApiResponse<FileInfo>;
    },

    downloadFile: async (projectId: string, fileId: string) => {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.baseUrl}/storage/${projectId}/files/${fileId}/download`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      return response.blob();
    },

    deleteFile: async (projectId: string, fileId: string) => {
      return this.request<ApiResponse>(
        `/storage/${projectId}/files/${fileId}`,
        {
          method: 'DELETE',
        }
      );
    },

    getStats: async (projectId: string) => {
      return this.request<ApiResponse<any>>(`/storage/${projectId}/stats`);
    },
  };
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Also export the class for testing or custom instances
export { ApiClient };