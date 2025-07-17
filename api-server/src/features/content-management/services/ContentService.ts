/**
 * Content Management Service
 * 
 * This service handles all content-related business logic including
 * CRUD operations, schema validation, and content transformations.
 * It's designed to be self-contained and easily testable.
 */

import { randomUUID } from "crypto";
import DatabaseConnection from "../../../shared/database/connection";
import { validateRequiredFields, validateJSON } from "../../../shared/utils/validation";
import {
  ContentItem,
  CreateContentData,
  UpdateContentData,
  ContentFilters,
  ContentStats,
  ContentValidationResult,
  ContentError,
  ContentType
} from "../types";

export class ContentService {
  private static readonly MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Get all content items with optional filtering
   */
  static async getAllContent(filters?: ContentFilters): Promise<{
    items: ContentItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    try {
      const db = DatabaseConnection.getInstance();
      
      // Build WHERE clause based on filters
      const whereConditions: string[] = [];
      const params: any[] = [];

      if (filters?.route_path) {
        whereConditions.push("route_path = ?");
        params.push(filters.route_path);
      }

      if (filters?.content_type) {
        whereConditions.push("content_type = ?");
        params.push(filters.content_type);
      }

      if (filters?.key) {
        whereConditions.push("key LIKE ?");
        params.push(`%${filters.key}%`);
      }

      if (filters?.search) {
        whereConditions.push("(key LIKE ? OR description LIKE ? OR CAST(data AS TEXT) LIKE ?)");
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      if (filters?.created_after) {
        whereConditions.push("created_at >= ?");
        params.push(filters.created_after);
      }

      if (filters?.created_before) {
        whereConditions.push("created_at <= ?");
        params.push(filters.created_before);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Build ORDER BY clause
      const sortBy = filters?.sort_by || 'created_at';
      const sortOrder = filters?.sort_order || 'desc';
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Pagination
      const page = filters?.page || 1;
      const limit = Math.min(filters?.limit || 50, 100); // Max 100 items per page
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM content_items 
        ${whereClause}
      `;
      const countResult = db.prepare(countQuery).get(...params) as { total: number };
      const total = countResult.total;

      // Get items
      const itemsQuery = `
        SELECT c.*, r.name as route_name
        FROM content_items c
        LEFT JOIN routes r ON c.parent_route_id = r.id
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;
      const items = db.prepare(itemsQuery).all(...params, limit, offset) as any[];

      // Transform items
      const transformedItems = items.map(this.transformDatabaseItem);

      return {
        items: transformedItems,
        total,
        page,
        limit,
        hasMore: (page * limit) < total
      };

    } catch (error) {
      console.error("Get all content error:", error);
      throw new Error("Failed to retrieve content items");
    }
  }

  /**
   * Get content item by ID
   */
  static async getContentById(id: number): Promise<ContentItem | null> {
    try {
      const db = DatabaseConnection.getInstance();
      const stmt = db.prepare(`
        SELECT c.*, r.name as route_name
        FROM content_items c
        LEFT JOIN routes r ON c.parent_route_id = r.id
        WHERE c.id = ?
      `);
      
      const item = stmt.get(id) as any;
      return item ? this.transformDatabaseItem(item) : null;

    } catch (error) {
      console.error("Get content by ID error:", error);
      throw new Error("Failed to retrieve content item");
    }
  }

  /**
   * Get content item by key and route
   */
  static async getContentByKey(key: string, routePath?: string): Promise<ContentItem | null> {
    try {
      const db = DatabaseConnection.getInstance();
      
      let query = `
        SELECT c.*, r.name as route_name
        FROM content_items c
        LEFT JOIN routes r ON c.parent_route_id = r.id
        WHERE c.key = ?
      `;
      const params: any[] = [key];

      if (routePath) {
        query += ` AND c.route_path = ?`;
        params.push(routePath);
      }

      const stmt = db.prepare(query);
      const item = stmt.get(...params) as any;
      
      return item ? this.transformDatabaseItem(item) : null;

    } catch (error) {
      console.error("Get content by key error:", error);
      throw new Error("Failed to retrieve content item");
    }
  }

  /**
   * Create new content item
   */
  static async createContent(data: CreateContentData, createdBy?: number): Promise<ContentItem> {
    try {
      // Validate required fields
      const validation = validateRequiredFields(data, ['key', 'data', 'content_type', 'route_path']);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
      }

      // Validate content data
      const contentValidation = this.validateContentData(data.data, data.content_type);
      if (!contentValidation.valid) {
        throw new Error(contentValidation.errors.join(', '));
      }

      // Check if key already exists for this route
      const existing = await this.getContentByKey(data.key, data.route_path);
      if (existing) {
        throw new Error(ContentError.DUPLICATE_KEY);
      }

      // Get route ID
      const routeId = await this.getRouteIdByPath(data.route_path);
      if (!routeId) {
        throw new Error(ContentError.INVALID_ROUTE_PATH);
      }

      const db = DatabaseConnection.getInstance();
      const id = Date.now(); // Simple ID generation
      const now = new Date().toISOString();

      // Serialize data
      const serializedData = typeof data.data === 'string' 
        ? data.data 
        : JSON.stringify(data.data);

      const stmt = db.prepare(`
        INSERT INTO content_items (
          id, key, data, content_type, description, route_path, 
          parent_route_id, schema_id, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.key,
        serializedData,
        data.content_type,
        data.description || null,
        data.route_path,
        routeId,
        data.schema_id || null,
        now,
        now,
        createdBy || null
      );

      const newItem = await this.getContentById(id);
      if (!newItem) {
        throw new Error("Failed to create content item");
      }

      return newItem;

    } catch (error) {
      console.error("Create content error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create content item");
    }
  }

  /**
   * Update content item
   */
  static async updateContent(
    id: number, 
    data: UpdateContentData, 
    updatedBy?: number
  ): Promise<ContentItem> {
    try {
      // Check if content exists
      const existing = await this.getContentById(id);
      if (!existing) {
        throw new Error(ContentError.CONTENT_NOT_FOUND);
      }

      // Validate content data if provided
      if (data.data !== undefined && data.content_type) {
        const contentValidation = this.validateContentData(data.data, data.content_type);
        if (!contentValidation.valid) {
          throw new Error(contentValidation.errors.join(', '));
        }
      }

      // Check for duplicate key if key is being changed
      if (data.key && data.key !== existing.key) {
        const routePath = data.route_path || existing.route_path;
        const duplicate = await this.getContentByKey(data.key, routePath);
        if (duplicate && duplicate.id !== id) {
          throw new Error(ContentError.DUPLICATE_KEY);
        }
      }

      // Get route ID if route path is being changed
      let routeId = existing.parent_route_id;
      if (data.route_path && data.route_path !== existing.route_path) {
        const newRouteId = await this.getRouteIdByPath(data.route_path);
        if (!newRouteId) {
          throw new Error(ContentError.INVALID_ROUTE_PATH);
        }
        routeId = newRouteId;
      }

      const db = DatabaseConnection.getInstance();
      const now = new Date().toISOString();

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: any[] = [];

      if (data.key !== undefined) {
        updateFields.push("key = ?");
        params.push(data.key);
      }

      if (data.data !== undefined) {
        updateFields.push("data = ?");
        const serializedData = typeof data.data === 'string' 
          ? data.data 
          : JSON.stringify(data.data);
        params.push(serializedData);
      }

      if (data.content_type !== undefined) {
        updateFields.push("content_type = ?");
        params.push(data.content_type);
      }

      if (data.description !== undefined) {
        updateFields.push("description = ?");
        params.push(data.description);
      }

      if (data.route_path !== undefined) {
        updateFields.push("route_path = ?, parent_route_id = ?");
        params.push(data.route_path, routeId);
      }

      if (data.schema_id !== undefined) {
        updateFields.push("schema_id = ?");
        params.push(data.schema_id);
      }

      updateFields.push("updated_at = ?");
      params.push(now);

      if (updatedBy) {
        updateFields.push("updated_by = ?");
        params.push(updatedBy);
      }

      params.push(id); // For WHERE clause

      const stmt = db.prepare(`
        UPDATE content_items 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...params);

      const updatedItem = await this.getContentById(id);
      if (!updatedItem) {
        throw new Error("Failed to update content item");
      }

      return updatedItem;

    } catch (error) {
      console.error("Update content error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update content item");
    }
  }

  /**
   * Delete content item
   */
  static async deleteContent(id: number): Promise<boolean> {
    try {
      // Check if content exists
      const existing = await this.getContentById(id);
      if (!existing) {
        throw new Error(ContentError.CONTENT_NOT_FOUND);
      }

      const db = DatabaseConnection.getInstance();
      const stmt = db.prepare("DELETE FROM content_items WHERE id = ?");
      const result = stmt.run(id);

      return result.changes > 0;

    } catch (error) {
      console.error("Delete content error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete content item");
    }
  }

  /**
   * Get content statistics
   */
  static async getContentStats(): Promise<ContentStats> {
    try {
      const db = DatabaseConnection.getInstance();

      // Total content count
      const totalResult = db.prepare("SELECT COUNT(*) as total FROM content_items").get() as { total: number };
      const totalContent = totalResult.total;

      // Content by type
      const typeResults = db.prepare(`
        SELECT content_type, COUNT(*) as count 
        FROM content_items 
        GROUP BY content_type
      `).all() as { content_type: string; count: number }[];

      const contentByType: Record<string, number> = {};
      typeResults.forEach(row => {
        contentByType[row.content_type] = row.count;
      });

      // Content by route
      const routeResults = db.prepare(`
        SELECT route_path, COUNT(*) as count 
        FROM content_items 
        GROUP BY route_path
      `).all() as { route_path: string; count: number }[];

      const contentByRoute: Record<string, number> = {};
      routeResults.forEach(row => {
        contentByRoute[row.route_path] = row.count;
      });

      // Recent content (last 10)
      const recentItems = await this.getAllContent({
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      return {
        totalContent,
        contentByType,
        contentByRoute,
        recentContent: recentItems.items,
        popularContent: [] // TODO: Implement view tracking
      };

    } catch (error) {
      console.error("Get content stats error:", error);
      throw new Error("Failed to retrieve content statistics");
    }
  }

  // Private helper methods

  /**
   * Transform database item to ContentItem interface
   */
  private static transformDatabaseItem(item: any): ContentItem {
    let parsedData;
    try {
      parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
    } catch {
      parsedData = item.data; // Keep as string if not valid JSON
    }

    return {
      id: item.id,
      key: item.key,
      data: parsedData,
      content_type: item.content_type,
      description: item.description,
      route_path: item.route_path,
      schema_id: item.schema_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      created_by: item.created_by,
      parent_route_id: item.parent_route_id
    };
  }

  /**
   * Validate content data based on content type
   */
  private static validateContentData(data: any, contentType: string): ContentValidationResult {
    const errors: string[] = [];

    // Check content size
    const serialized = JSON.stringify(data);
    if (serialized.length > this.MAX_CONTENT_SIZE) {
      errors.push(ContentError.CONTENT_TOO_LARGE);
    }

    // Validate based on content type
    switch (contentType) {
      case ContentType.JSON:
        if (typeof data !== 'object') {
          errors.push("JSON content must be an object");
        }
        break;

      case ContentType.TEXT:
        if (typeof data !== 'string') {
          errors.push("Text content must be a string");
        }
        break;

      case ContentType.HTML:
        if (typeof data !== 'string') {
          errors.push("HTML content must be a string");
        }
        // Basic HTML validation
        if (typeof data === 'string' && !data.includes('<') && !data.includes('>')) {
          // Warning: might not be valid HTML
        }
        break;

      case ContentType.MARKDOWN:
        if (typeof data !== 'string') {
          errors.push("Markdown content must be a string");
        }
        break;

      default:
        // Custom content type - minimal validation
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get route ID by path
   */
  private static async getRouteIdByPath(routePath: string): Promise<number | null> {
    try {
      const db = DatabaseConnection.getInstance();
      const stmt = db.prepare("SELECT id FROM routes WHERE path = ?");
      const result = stmt.get(routePath) as { id: number } | undefined;
      return result?.id || null;
    } catch {
      return null;
    }
  }
}