/**
 * Content Management API Client
 *
 * This module handles all API calls related to content management functionality.
 * It provides a clean interface for the frontend components to interact with
 * the content backend services.
 */

import axios from "axios";

// Use environment variable or fallback to localhost
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/api";

// Create axios instance specifically for content management
const contentAxios = axios.create({
  baseURL: `${API_BASE_URL}/admin/content`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: false,
});

// Request interceptor to add auth token
contentAxios.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle errors
contentAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Content API Error:", error.message);

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Content Management API interface types
 */
export interface ContentItem {
  id: number;
  key: string;
  data: any;
  content_type: string;
  description?: string;
  route_path: string;
  schema_id?: number;
  schema?: ContentSchema;
  created_at: string;
  updated_at: string;
  created_by?: number;
  parent_route_id?: number;
}

export interface ContentSchema {
  id?: number;
  name: string;
  description?: string;
  definition: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateContentData {
  key: string;
  data: any;
  content_type: string;
  description?: string;
  route_path: string;
  schema_id?: number;
  schema?: ContentSchema;
}

export interface UpdateContentData {
  key?: string;
  data?: any;
  content_type?: string;
  description?: string;
  route_path?: string;
  schema_id?: number;
  schema?: ContentSchema;
}

export interface ContentFilters {
  route_path?: string;
  content_type?: string;
  key?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  created_after?: string;
  created_before?: string;
}

export interface ContentListResponse {
  success: boolean;
  data?: {
    items: ContentItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  error?: string;
}

export interface ContentResponse {
  success: boolean;
  data?: ContentItem;
  error?: string;
}

export interface ContentStats {
  totalContent: number;
  contentByType: Record<string, number>;
  contentByRoute: Record<string, number>;
  recentContent: ContentItem[];
  popularContent: ContentItem[];
}

/**
 * Content Management API Client
 */
export const contentManagementAPI = {
  /**
   * Get all content items with optional filtering
   */
  getAllContent: async (
    filters?: ContentFilters
  ): Promise<ContentListResponse> => {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await contentAxios.get(`/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error("Get all content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to fetch content",
      };
    }
  },

  /**
   * Get content item by ID
   */
  getContentById: async (id: number): Promise<ContentResponse> => {
    try {
      const response = await contentAxios.get(`/get/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Get content by ID error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to fetch content item",
      };
    }
  },

  /**
   * Get content items by route path
   */
  getContentByRoute: async (
    routePath: string
  ): Promise<ContentListResponse> => {
    try {
      const filters: ContentFilters = { route_path: routePath };
      return await contentManagementAPI.getAllContent(filters);
    } catch (error: any) {
      console.error("Get content by route error:", error);
      throw {
        success: false,
        error:
          error.response?.data?.error || "Failed to fetch content for route",
      };
    }
  },

  /**
   * Create new content item
   */
  createContent: async (data: CreateContentData): Promise<ContentResponse> => {
    try {
      const response = await contentAxios.post("/create", data);
      return response.data;
    } catch (error: any) {
      console.error("Create content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to create content",
      };
    }
  },

  /**
   * Update content item
   */
  updateContent: async (
    id: number,
    data: UpdateContentData
  ): Promise<ContentResponse> => {
    try {
      const response = await contentAxios.put(`/modify/id/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error("Update content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to update content",
      };
    }
  },

  /**
   * Delete content item
   */
  deleteContent: async (
    id: number
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await contentAxios.delete(`/delete/id/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Delete content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to delete content",
      };
    }
  },

  /**
   * Bulk delete content items
   */
  bulkDeleteContent: async (
    ids: number[]
  ): Promise<{ success: boolean; deleted: number; errors: string[] }> => {
    try {
      const results = await Promise.allSettled(
        ids.map((id) => contentManagementAPI.deleteContent(id))
      );

      let deleted = 0;
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          deleted++;
        } else {
          const error =
            result.status === "rejected"
              ? result.reason?.error || "Unknown error"
              : "Failed to delete";
          errors.push(`ID ${ids[index]}: ${error}`);
        }
      });

      return { success: true, deleted, errors };
    } catch (error: any) {
      console.error("Bulk delete content error:", error);
      throw {
        success: false,
        deleted: 0,
        errors: ["Bulk delete operation failed"],
      };
    }
  },

  /**
   * Search content items
   */
  searchContent: async (
    query: string,
    filters?: Partial<ContentFilters>
  ): Promise<ContentListResponse> => {
    try {
      const searchFilters: ContentFilters = {
        search: query,
        ...filters,
      };

      return await contentManagementAPI.getAllContent(searchFilters);
    } catch (error: any) {
      console.error("Search content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to search content",
      };
    }
  },

  /**
   * Get content statistics
   */
  getContentStats: async (): Promise<{
    success: boolean;
    data?: ContentStats;
    error?: string;
  }> => {
    try {
      // For now, we'll calculate stats from the content list
      // In the future, this should be a dedicated endpoint
      const allContent = await contentManagementAPI.getAllContent({
        limit: 1000,
      });

      if (!allContent.success || !allContent.data) {
        throw new Error("Failed to fetch content for stats");
      }

      const { items } = allContent.data;

      // Calculate statistics
      const totalContent = items.length;

      const contentByType: Record<string, number> = {};
      const contentByRoute: Record<string, number> = {};

      items.forEach((item) => {
        // Count by type
        contentByType[item.content_type] =
          (contentByType[item.content_type] || 0) + 1;

        // Count by route
        contentByRoute[item.route_path] =
          (contentByRoute[item.route_path] || 0) + 1;
      });

      // Get recent content (last 10)
      const recentContent = items
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 10);

      const stats: ContentStats = {
        totalContent,
        contentByType,
        contentByRoute,
        recentContent,
        popularContent: [], // TODO: Implement view tracking
      };

      return { success: true, data: stats };
    } catch (error: any) {
      console.error("Get content stats error:", error);
      throw {
        success: false,
        error:
          error.response?.data?.error || "Failed to get content statistics",
      };
    }
  },

  /**
   * Validate content data
   */
  validateContent: async (
    data: any,
    contentType: string,
    _schemaId?: number
  ): Promise<{ valid: boolean; errors: string[]; warnings?: string[] }> => {
    try {
      // Client-side validation
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic type validation
      if (!data) {
        errors.push("Content data is required");
      }

      // Content type specific validation
      switch (contentType) {
        case "json":
          if (typeof data !== "object") {
            errors.push("JSON content must be an object");
          } else {
            try {
              JSON.stringify(data);
            } catch {
              errors.push("Invalid JSON structure");
            }
          }
          break;

        case "text":
        case "html":
        case "markdown":
          if (typeof data !== "string") {
            errors.push(
              `${contentType.toUpperCase()} content must be a string`
            );
          }
          break;

        default:
          // Custom content type - minimal validation
          if (data === null || data === undefined) {
            errors.push("Content data cannot be null or undefined");
          }
          break;
      }

      // Size validation (10MB limit)
      const serialized = JSON.stringify(data);
      if (serialized.length > 10 * 1024 * 1024) {
        errors.push("Content size exceeds 10MB limit");
      }

      // TODO: Schema validation if schemaId is provided

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      console.error("Validate content error:", error);
      return {
        valid: false,
        errors: ["Validation failed"],
      };
    }
  },

  /**
   * Duplicate content item
   */
  duplicateContent: async (
    id: number,
    newKey: string
  ): Promise<ContentResponse> => {
    try {
      // Get original content
      const original = await contentManagementAPI.getContentById(id);

      if (!original.success || !original.data) {
        throw new Error("Original content not found");
      }

      // Create duplicate with new key
      const duplicateData: CreateContentData = {
        key: newKey,
        data: original.data.data,
        content_type: original.data.content_type,
        description: `Copy of ${
          original.data.description || original.data.key
        }`,
        route_path: original.data.route_path,
        schema_id: original.data.schema_id,
      };

      return await contentManagementAPI.createContent(duplicateData);
    } catch (error: any) {
      console.error("Duplicate content error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to duplicate content",
      };
    }
  },
};

export default contentManagementAPI;
