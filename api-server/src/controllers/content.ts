import { Request, Response } from "express";
import database from "../services/database";
import { ApiResponse, ContentItem, CreateContentRequest } from "../types";

export class ContentController {
  static getAllContent(req: Request, res: Response): void {
    try {
      const { route_path, content_type } = req.query;

      const content = database.getAllContent(
        route_path as string,
        content_type as string
      );

      const response: ApiResponse<ContentItem[]> = {
        success: true,
        data: content,
        message: `Retrieved ${content.length} content items`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all content error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve content",
      };
      res.status(500).json(response);
    }
  }

  static getContentByKey(req: Request, res: Response): void {
    try {
      const { key } = req.params;
      const content = database.getContentByKey(key);

      if (!content) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentItem> = {
        success: true,
        data: content,
        message: `Retrieved content for key '${key}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get content by key error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve content",
      };
      res.status(500).json(response);
    }
  }

  static getContentById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const numericId = parseInt(id);

      if (isNaN(numericId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid content ID",
        };
        res.status(400).json(response);
        return;
      }

      const content = database.getContentById(numericId);

      if (!content) {
        const response: ApiResponse = {
          success: false,
          error: `Content with ID '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentItem> = {
        success: true,
        data: content,
        message: `Retrieved content for ID '${id}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get content by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve content",
      };
      res.status(500).json(response);
    }
  }

  static createContent(req: Request, res: Response): void {
    try {
      console.log(
        "Create content request body:",
        JSON.stringify(req.body, null, 2)
      );

      const { key, data, description, route_path, content_type } =
        req.body as CreateContentRequest;
      const { schema } = req.body; // Schema is optional and not in the strict type

      // Validate required fields
      if (!key || data === undefined || !route_path || !content_type) {
        console.log("Validation failed - missing fields:", {
          key: !!key,
          data: data !== undefined,
          route_path: !!route_path,
          content_type: !!content_type,
        });
        const response: ApiResponse = {
          success: false,
          error: "Key, data, route_path, and content_type are required",
        };
        res.status(400).json(response);
        return;
      }

      // Check if key already exists
      const existingContent = database.getContentByKey(key);
      if (existingContent) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' already exists. Use PUT to update.`,
        };
        res.status(409).json(response);
        return;
      }

      const newContent = database.createContent({
        key,
        data,
        description,
        route_path,
        content_type,
        schema,
      });

      const response: ApiResponse<ContentItem> = {
        success: true,
        data: newContent,
        message: `Content created with key '${key}'`,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Create content error:", error);
      const response: ApiResponse = {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create content",
      };
      res.status(500).json(response);
    }
  }

  static updateContent(req: Request, res: Response): void {
    try {
      const { key } = req.params;
      const updates = req.body;

      const updatedContent = database.updateContent(key, updates);

      if (!updatedContent) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentItem> = {
        success: true,
        data: updatedContent,
        message: `Content updated for key '${key}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update content error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update content",
      };
      res.status(500).json(response);
    }
  }

  static updateContentById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const numericId = parseInt(id);
      const updates = req.body;

      if (isNaN(numericId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid content ID",
        };
        res.status(400).json(response);
        return;
      }

      const updatedContent = database.updateContentById(numericId, updates);

      if (!updatedContent) {
        const response: ApiResponse = {
          success: false,
          error: `Content with ID '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentItem> = {
        success: true,
        data: updatedContent,
        message: `Content updated for ID '${id}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update content by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update content",
      };
      res.status(500).json(response);
    }
  }

  static deleteContent(req: Request, res: Response): void {
    try {
      const { key } = req.params;

      const deleted = database.deleteContent(key);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `Content with key '${key}' deleted successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Delete content error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete content",
      };
      res.status(500).json(response);
    }
  }

  static deleteContentById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const numericId = parseInt(id);

      if (isNaN(numericId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid content ID",
        };
        res.status(400).json(response);
        return;
      }

      const deleted = database.deleteContentById(numericId);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: `Content with ID '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `Content with ID '${id}' deleted successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Delete content by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete content",
      };
      res.status(500).json(response);
    }
  }

  static getPublicContentByRoute(req: Request, res: Response): void {
    try {
      const { route_path, key } = req.params;

      // Find content by key and route path
      const content = database.getContentByKeyAndRoute(key, route_path);

      if (!content) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' not found in route '${route_path}'`,
        };
        res.status(404).json(response);
        return;
      }

      // Check the route's access level for public endpoints
      const route = database.getRouteByPath(route_path);
      if (route && route.access_level === "private") {
        const response: ApiResponse = {
          success: false,
          error: "Access denied",
        };
        res.status(403).json(response);
        return;
      }

      // For public endpoints, return formatted response
      const response: ApiResponse = {
        success: true,
        data: content.data,
        message: `Retrieved content for key '${key}' from route '${route_path}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get public content by route error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve content",
      };
      res.status(500).json(response);
    }
  }

  static getPublicContent(req: Request, res: Response): void {
    try {
      const { key } = req.params;
      const content = database.getContentByKey(key);

      if (!content) {
        const response: ApiResponse = {
          success: false,
          error: `Content with key '${key}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Check the route's access level for public endpoints
      const route = database.getRouteByPath(content.route_path);
      if (route && route.access_level === "private") {
        const response: ApiResponse = {
          success: false,
          error: "Access denied",
        };
        res.status(403).json(response);
        return;
      }

      // For public endpoints, return formatted response
      const response: ApiResponse = {
        success: true,
        data: content.data,
        message: `Retrieved content for key '${key}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get public content error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve content",
      };
      res.status(500).json(response);
    }
  }
}
