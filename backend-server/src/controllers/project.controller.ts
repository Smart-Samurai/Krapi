import { ApiKeyScope } from "@krapi/sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";
import { AuthenticatedRequest, ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Project Controller
 *
 * Manages all project-related operations including:
 * - Project CRUD operations
 * - Project statistics
 * - API key regeneration
 * - Project settings management
 *
 * All methods require authentication and proper scopes.
 */
export class ProjectController {
  private db: DatabaseService;
  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get all projects with pagination
   * GET /krapi/k1/projects
   *
   * Requires: projects:read scope
   * Query params: page (default: 1), limit (default: 50)
   *
   * @param req - Request with pagination params
   * @param res - Response with paginated projects
   */
  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Get all projects from database
      const projects = await this.db.getAllProjects();

      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedProjects = projects.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: paginatedProjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: projects.length,
          totalPages: Math.ceil(projects.length / limitNum),
          hasNext: endIndex < projects.length,
          hasPrev: pageNum > 1,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Get all projects error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch projects",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Get project by ID
   * GET /krapi/k1/projects/:id
   *
   * Requires: projects:read scope
   *
   * @param req - Request with project ID in params
   * @param res - Response with project data
   */
  getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Get project from database
      const project = await this.db.getProjectById(sanitizedId);

      if (project) {
        res.status(200).json({
          success: true,
          data: project,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Get project by ID error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Create a new project
   * POST /krapi/k1/projects
   *
   * Requires: projects:create scope
   * Body: { name, description?, settings? }
   *
   * @param req - Request with project data
   * @param res - Response with created project
   */
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, settings } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Project name is required and must be a non-empty string",
          code: "INVALID_NAME",
        } as ApiResponse);
        return;
      }

      if (name.trim().length > 100) {
        res.status(400).json({
          success: false,
          error: "Project name must be 100 characters or less",
          code: "NAME_TOO_LONG",
        } as ApiResponse);
        return;
      }

      // Create project directly using database service
      const project = await this.db.createProject({
        name: name.trim(),
        description: description?.trim() || undefined,
        settings: settings || {},
        allowed_origins: [],
      });

      res.status(201).json({
        success: true,
        data: project,
        message: `Project created successfully`,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Create project error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to create project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const updates = req.body;

      // Use the SDK as the single source of truth
      const project = await this.db.updateProject(projectId, updates);

      if (project) {
        res.status(200).json({
          success: true,
          data: project,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update project",
      } as ApiResponse);
      return;
    }
  };

  // Delete project
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use the SDK as the single source of truth
      const project = await this.db.deleteProject(projectId);

      if (project) {
        res.status(200).json({
          success: true,
          message: "Project deleted successfully",
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete project",
      } as ApiResponse);
      return;
    }
  };

  // Get project statistics
  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Get project stats from database
      const stats = await this.db.getProjectStats(sanitizedId);

      if (stats) {
        // Transform stats to match test expectations
        const transformedStats = {
          totalCollections: stats.totalCollections || 0,
          totalDocuments: stats.totalDocuments || 0,
          totalUsers: stats.totalUsers || 0,
          storageUsed: stats.storageUsed || 0,
          apiCalls: stats.apiCallsCount || 0,
          lastActivity: stats.lastApiCall || null,
          ...stats, // Include any additional stats
        };

        res.status(200).json({
          success: true,
          data: transformedStats,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project stats not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Get project stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project statistics",
      } as ApiResponse);
      return;
    }
  };

  // Get project activity logs
  getProjectActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { limit = 50, days } = req.query;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Get project activity logs from database
      const activity = await this.db.getProjectActivity(sanitizedId, {
        limit: parseInt(limit as string) || 100,
      });

      if (activity) {
        res.status(200).json({
          success: true,
          data: {
            activities: activity,
            total: Array.isArray(activity) ? activity.length : 0,
            limit: parseInt(limit as string) || 100,
            days: days ? parseInt(days as string) : undefined,
          },
        } as ApiResponse);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch project activity",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Get project activity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project activity",
      } as ApiResponse);
      return;
    }
  };

  // Regenerate API key
  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      // Regenerate API key in database
      const newApiKey = await this.db.regenerateProjectApiKey(sanitizedId);

      if (newApiKey) {
        res.status(200).json({
          success: true,
          data: { apiKey: newApiKey },
          message: "API key regenerated successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to regenerate API key",
      } as ApiResponse);
      return;
    }
  };

  // Get project settings
  getProjectSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Get project settings from database
      const project = await this.db.getProjectById(sanitizedId);

      if (project) {
        res.status(200).json({
          success: true,
          data: project.settings || {},
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Get project settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project settings",
      } as ApiResponse);
    }
  };

  /**
   * Update project settings
   * PUT /krapi/k1/projects/:id/settings
   *
   * Requires: projects:write scope
   * Body: { settings }
   *
   * @param req - Request with project ID in params and settings data
   * @param res - Response with updated project
   */
  updateProjectSettings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { settings } = req.body;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!settings || typeof settings !== "object") {
        res.status(400).json({
          success: false,
          error: "Settings object is required",
          code: "INVALID_SETTINGS",
        } as ApiResponse);
        return;
      }

      // Update project settings in database
      const project = await this.db.updateProject(sanitizedId, {
        settings,
      });

      if (project) {
        res.status(200).json({
          success: true,
          data: project.settings,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Update project settings error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to update project settings",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Create project API key
  /**
   * Create project API key
   * POST /krapi/k1/projects/:id/api-keys
   *
   * Requires: projects:write scope
   * Body: { name, scopes? }
   *
   * @param req - Request with project ID in params and API key data
   * @param res - Response with created API key
   */
  createProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId } = req.params;
      const { name, scopes } = req.body;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "API key name is required and must be a non-empty string",
          code: "INVALID_NAME",
        } as ApiResponse);
        return;
      }

      // Create API key in database
      const apiKey = await this.db.createProjectApiKey({
        project_id: sanitizedId,
        name: name.trim(),
        scopes: (scopes || []) as ApiKeyScope[],
        user_id: currentUser.id,
      });

      if (apiKey) {
        // Update the user_id field since the SDK sets it to "system"
        await this.db.updateProjectApiKey(sanitizedId, apiKey.id, {
          user_id: currentUser.id,
        });

        // Log the action
        await this.db.createChangelogEntry({
          project_id: sanitizedId,
          entity_type: "api_key",
          entity_id: apiKey.id,
          action: "created",
          changes: { name, scopes },
          performed_by: currentUser.id,
          user_id: currentUser.id,
          resource_type: "api_key",
          resource_id: apiKey.id,
        });

        res.status(201).json({
          success: true,
          data: apiKey,
          message: "API key created successfully",
        } as ApiResponse);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create API key",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Create project API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to create API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Get project API keys
  getProjectApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      // Get API keys from database
      const apiKeys = await this.db.getProjectApiKeys(sanitizedId);

      if (apiKeys) {
        res.status(200).json({
          success: true,
          data: apiKeys,
        } as ApiResponse);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch API keys",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Get project API keys error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API keys",
      } as ApiResponse);
    }
  };

  /**
   * Delete project API key
   * DELETE /krapi/k1/projects/:id/api-keys/:keyId
   *
   * Requires: projects:write scope
   *
   * @param req - Request with project ID and key ID in params
   * @param res - Response with deletion result
   */
  deleteProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId, keyId } = req.params;

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!keyId) {
        res.status(400).json({
          success: false,
          error: "API key ID is required",
          code: "INVALID_KEY_ID",
        } as ApiResponse);
        return;
      }

      // Get the API key first to check if it exists
      const apiKey = await this.db.getProjectApiKeyById(keyId);

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        } as ApiResponse);
        return;
      }

      // Delete API key from database
      const result = await this.db.deleteProjectApiKey(keyId);

      if (result) {
        // Log the action
        await this.db.createChangelogEntry({
          project_id: sanitizedId,
          entity_type: "api_key",
          entity_id: keyId,
          action: "deleted",
          changes: { name: apiKey.name },
          performed_by: currentUser.id,
          user_id: currentUser.id,
          resource_type: "api_key",
          resource_id: keyId,
        });

        res.status(200).json({
          success: true,
          data: { id: keyId },
          message: "API key deleted successfully",
        } as ApiResponse);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to delete API key",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Delete project API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };
}

export default new ProjectController();
