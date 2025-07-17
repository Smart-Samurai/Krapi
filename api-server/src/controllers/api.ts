import { Request, Response } from "express";
import { randomUUID } from "crypto";
import * as crypto from "crypto";
import DatabaseService from "../services/database";

export class ApiController {
  private static db = DatabaseService;

  // Generate a secure API key
  private static generateApiKey(): string {
    const prefix = "krapi_";
    const keyLength = 32;
    const randomBytes = crypto.randomBytes(keyLength);
    return prefix + randomBytes.toString("hex");
  }

  // Get all API keys
  static async getApiKeys(req: Request, res: Response) {
    try {
      const apiKeys = await ApiController.db.getApiKeys();
      res.json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API keys",
      });
    }
  }

  // Create a new API key
  static async createApiKey(req: Request, res: Response) {
    try {
      const { name, permissions, rate_limit, expires_at } = req.body;

      if (!name || !permissions || !Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          error: "Name and permissions array are required",
        });
        return;
      }

      const apiKey = {
        id: randomUUID(),
        name,
        key: ApiController.generateApiKey(),
        permissions,
        rate_limit: rate_limit || 1000,
        active: true,
        expires_at: expires_at || null,
        created_at: new Date().toISOString(),
        usage_count: 0,
      };

      const created = await ApiController.db.createApiKey(apiKey);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      });
    }
  }

  // Update an API key
  static async updateApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating the key itself or creation date
      delete updates.key;
      delete updates.id;
      delete updates.created_at;

      const updated = await ApiController.db.updateApiKey(id, updates);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update API key",
      });
    }
  }

  // Delete an API key
  static async deleteApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await ApiController.db.deleteApiKey(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "API key deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
      });
    }
  }

  // Toggle API key status
  static async toggleApiKeyStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const apiKey = await ApiController.db.getApiKeyById(id);
      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      const updated = await ApiController.db.updateApiKey(id, {
        active: !apiKey.active,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error toggling API key status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to toggle API key status",
      });
    }
  }

  // Regenerate API key
  static async regenerateApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const newKey = ApiController.generateApiKey();
      const updated = await ApiController.db.updateApiKey(id, {
        key: newKey,
        usage_count: 0, // Reset usage count when regenerating
      });

      if (!updated) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
        message: "API key regenerated successfully",
      });
    } catch (error) {
      console.error("Error regenerating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to regenerate API key",
      });
    }
  }

  // Get API endpoints
  static async getApiEndpoints(req: Request, res: Response) {
    try {
      const endpoints = await ApiController.db.getApiEndpoints();
      res.json({
        success: true,
        data: endpoints,
      });
    } catch (error) {
      console.error("Error fetching API endpoints:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API endpoints",
      });
    }
  }

  // Create API endpoint
  static async createApiEndpoint(req: Request, res: Response) {
    try {
      const {
        method,
        path,
        handler,
        description,
        auth_required,
        permissions,
        rate_limit,
      } = req.body;

      if (!method || !path || !handler) {
        res.status(400).json({
          success: false,
          error: "Method, path, and handler are required",
        });
        return;
      }

      const endpoint = {
        id: randomUUID(),
        method,
        path,
        handler,
        description: description || "",
        auth_required: auth_required !== false,
        permissions: permissions || [],
        rate_limit: rate_limit || 100,
        active: true,
        created_at: new Date().toISOString(),
        request_count: 0,
        avg_response_time: 0,
      };

      const created = await ApiController.db.createApiEndpoint(endpoint);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      console.error("Error creating API endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API endpoint",
      });
    }
  }

  // Update API endpoint
  static async updateApiEndpoint(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating certain fields
      delete updates.id;
      delete updates.created_at;
      delete updates.request_count;
      delete updates.avg_response_time;

      const updated = await ApiController.db.updateApiEndpoint(id, updates);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: "API endpoint not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error updating API endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update API endpoint",
      });
    }
  }

  // Delete API endpoint
  static async deleteApiEndpoint(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await ApiController.db.deleteApiEndpoint(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "API endpoint not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "API endpoint deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting API endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API endpoint",
      });
    }
  }

  // Get API statistics
  static async getApiStats(req: Request, res: Response) {
    try {
      const stats = await ApiController.db.getApiStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching API stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API statistics",
      });
    }
  }

  // Get rate limits
  static async getRateLimits(req: Request, res: Response) {
    try {
      const rateLimits = await ApiController.db.getRateLimits();
      res.json({
        success: true,
        data: rateLimits,
      });
    } catch (error) {
      console.error("Error fetching rate limits:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch rate limits",
      });
    }
  }

  // Create rate limit
  static async createRateLimit(req: Request, res: Response) {
    try {
      const {
        name,
        requests_per_minute,
        requests_per_hour,
        requests_per_day,
        applies_to,
      } = req.body;

      if (!name || !requests_per_minute) {
        res.status(400).json({
          success: false,
          error: "Name and requests_per_minute are required",
        });
        return;
      }

      const rateLimit = {
        id: randomUUID(),
        name,
        requests_per_minute,
        requests_per_hour: requests_per_hour || requests_per_minute * 60,
        requests_per_day: requests_per_day || requests_per_minute * 60 * 24,
        applies_to: applies_to || "global",
        active: true,
        created_at: new Date().toISOString(),
      };

      const created = await ApiController.db.createRateLimit(rateLimit);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      console.error("Error creating rate limit:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create rate limit",
      });
    }
  }

  // Update rate limit
  static async updateRateLimit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating certain fields
      delete updates.id;
      delete updates.created_at;

      const updated = await ApiController.db.updateRateLimit(id, updates);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: "Rate limit not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error updating rate limit:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update rate limit",
      });
    }
  }

  // Delete rate limit
  static async deleteRateLimit(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await ApiController.db.deleteRateLimit(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "Rate limit not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Rate limit deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting rate limit:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete rate limit",
      });
    }
  }
}
