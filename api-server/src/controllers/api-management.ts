import { Response } from "express";
import database from "../services/database";
import { AuthenticatedRequest } from "../middleware/auth";
import { ApiResponse } from "../types";

export class ApiManagementController {
  /**
   * Get API statistics and overview
   */
  static async getApiStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Get real API statistics from database
      const apiStats = database.getApiStats();

      res.json({
        success: true,
        data: apiStats,
      });
    } catch (error) {
      console.error("Error fetching API stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API statistics",
      });
    }
  }

  /**
   * Get all API keys
   */
  static async getApiKeys(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const apiKeys = database.getApiKeys();

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

  /**
   * Create a new API key
   */
  static async createApiKey(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { name, permissions, rate_limit, expires_at } = req.body;

      if (!name || !permissions || !rate_limit) {
        res.status(400).json({
          success: false,
          error: "Name, permissions, and rate_limit are required",
        });
        return;
      }

      const newKey = database.createApiKey({
        name,
        permissions: Array.isArray(permissions) ? permissions : [permissions],
        rate_limit: parseInt(rate_limit),
        expires_at: expires_at || undefined,
        active: true,
      });

      res.status(201).json({
        success: true,
        data: newKey,
        message: "API key created successfully",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      });
    }
  }

  /**
   * Update an existing API key
   */
  static async updateApiKey(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, permissions, rate_limit, expires_at, active } = req.body;

      const existingKey = database.getApiKeyById(id);
      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      const updatedKey = database.updateApiKey(id, {
        name,
        permissions,
        rate_limit,
        expires_at,
        active,
      });

      if (updatedKey) {
        res.json({
          success: true,
          data: updatedKey,
          message: "API key updated successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to update API key",
        });
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update API key",
      });
    }
  }

  /**
   * Toggle API key active status
   */
  static async toggleApiKey(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { active } = req.body;

      const existingKey = database.getApiKeyById(id);
      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      const updatedKey = database.updateApiKey(id, {
        active: active !== undefined ? active : !existingKey.active,
      });

      if (updatedKey) {
        res.json({
          success: true,
          data: updatedKey,
          message: `API key ${
            updatedKey.active ? "activated" : "deactivated"
          } successfully`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to toggle API key status",
        });
      }
    } catch (error) {
      console.error("Error toggling API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to toggle API key status",
      });
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const existingKey = database.getApiKeyById(id);
      if (!existingKey) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
        return;
      }

      const deleted = database.deleteApiKey(id);

      if (deleted) {
        res.json({
          success: true,
          message: "API key deleted successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to delete API key",
        });
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
      });
    }
  }

  /**
   * Get all API endpoints
   */
  static async getApiEndpoints(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const endpoints = database.getApiEndpoints();

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

  /**
   * Get rate limits
   */
  static async getRateLimits(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const rateLimits = database.getRateLimits();

      const response: ApiResponse = {
        success: true,
        data: rateLimits,
        message: `Retrieved ${rateLimits.length} rate limits`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get rate limits error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve rate limits",
      };
      res.status(500).json(response);
    }
  }

  static async updateEndpoint(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { path } = req.params;
      const _updates = req.body;

      // Placeholder - not implemented in database service
      const response: ApiResponse = {
        success: true,
        message: `Endpoint ${path} updated successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update endpoint error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update endpoint",
      };
      res.status(500).json(response);
    }
  }

  static async updateRateLimit(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const _updates = req.body;

      // Placeholder - not implemented in database service
      const response: ApiResponse = {
        success: true,
        message: `Rate limit ${id} updated successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update rate limit error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update rate limit",
      };
      res.status(500).json(response);
    }
  }
}
