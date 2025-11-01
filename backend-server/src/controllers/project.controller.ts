import { BackendSDK, ProjectSettings } from "@krapi/sdk";
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
 *
 * Follows SDK-first architecture: all methods use BackendSDK when available.
 */
export class ProjectController {
  private db: DatabaseService;
  private backendSDK: BackendSDK | null = null;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  setBackendSDK(sdk: BackendSDK) {
    this.backendSDK = sdk;
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

      // Use SDK method for getting all projects (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const projects = await this.backendSDK.projects.getAllProjects({
            limit: limitNum,
            offset: (pageNum - 1) * limitNum,
          });

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
        } catch (sdkError) {
          console.error("SDK getAllProjects error:", sdkError);
          // Fall back to database method if SDK fails
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
        }
      } else {
        // Fall back to database method if SDK not available
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
      }
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

      // Use SDK method for getting project by ID (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const project = await this.backendSDK.projects.getProjectById(
            sanitizedId
          );

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
        } catch (sdkError) {
          console.error("SDK getProjectById error:", sdkError);
          // Fall back to database method if SDK fails
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
        }
      } else {
        // Fall back to database method if SDK not available
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
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { name, description, settings } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Project name is required",
        } as ApiResponse);
        return;
      }

      // Use SDK method for creating project (SDK-first architecture)
      if (this.backendSDK) {
        try {
          console.log("🔍 [PROJECT DEBUG] Attempting to create project with:", {
            ownerId: currentUser.id,
            projectData: { name, description, settings },
          });

          const project = await this.backendSDK.projects.createProject(
            currentUser.id,
            {
              name,
              description,
              settings,
            }
          );

          if (project) {
            res.status(201).json({
              success: true,
              data: project,
            } as ApiResponse);
          } else {
            res.status(500).json({
              success: false,
              error: "Failed to create project",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error(
            "🔍 [PROJECT DEBUG] SDK createProject error:",
            sdkError
          );
          console.error("🔍 [PROJECT DEBUG] Error details:", {
            message: sdkError.message,
            stack: sdkError.stack,
            name: sdkError.name,
          });
          // Fall back to database method if SDK fails
          const project = await this.db.createProject({
            name,
            description,
            settings,
            allowed_origins: [],
          });

          if (project) {
            res.status(201).json({
              success: true,
              data: project,
            } as ApiResponse);
          } else {
            res.status(500).json({
              success: false,
              error: "Failed to create project",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const project = await this.db.createProject({
          name,
          description,
          settings,
          allowed_origins: [],
        });

        if (project) {
          res.status(201).json({
            success: true,
            data: project,
          } as ApiResponse);
        } else {
          res.status(500).json({
            success: false,
            error: "Failed to create project",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Create project error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to create project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const updates = req.body;

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

      // Use SDK method for updating project (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const project = await this.backendSDK.projects.updateProject(
            sanitizedId,
            updates
          );

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
        } catch (sdkError) {
          console.error("SDK updateProject error:", sdkError);
          // Fall back to database method if SDK fails
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
        }
      } else {
        // Fall back to database method if SDK not available
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
      }
      return;
    } catch (error) {
      console.error("Update project error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to update project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Delete project
  deleteProject = async (req: Request, res: Response): Promise<void> => {
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

      // Use SDK method for deleting project (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const success = await this.backendSDK.projects.deleteProject(
            sanitizedId
          );

          if (success) {
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
        } catch (sdkError) {
          console.error("SDK deleteProject error:", sdkError);
          // Fall back to database method if SDK fails
          const success = await this.db.deleteProject(projectId);

          if (success) {
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
        }
      } else {
        // Fall back to database method if SDK not available
        const success = await this.db.deleteProject(projectId);

        if (success) {
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
      }
      return;
    } catch (error) {
      console.error("Delete project error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to delete project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
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

      // Use SDK method for project statistics (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const stats = await this.backendSDK.projects.getProjectStatistics(
            sanitizedId
          );

          if (stats) {
            // Transform stats to match test expectations
            const transformedStats = {
              totalCollections: stats.totalCollections || 0,
              totalDocuments: stats.totalDocuments || 0,
              totalUsers: 0, // Not available in SDK stats, default to 0
              storageUsed: stats.storageUsed || 0,
              apiCalls: stats.apiCallsToday || 0,
              lastActivity: stats.lastActivity || null,
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
        } catch (sdkError) {
          console.error("SDK getStatistics error:", sdkError);
          // Fall back to database method if SDK fails
          const stats = await this.db.getProjectStats(sanitizedId);

          if (stats) {
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
        }
      } else {
        // Fall back to database method if SDK not available
        const stats = await this.db.getProjectStats(sanitizedId);

        if (stats) {
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

      // Use SDK method for project activity (SDK-first architecture)
      if (this.backendSDK) {
        try {
          console.log("🔍 [DEBUG] Calling getProjectActivity with:", {
            sanitizedId,
            limit,
            days,
          });

          const activity = await this.backendSDK.getProjectActivity(
            sanitizedId,
            {
              limit: parseInt(limit as string) || 100,
              days: days ? parseInt(days as string) : undefined,
            }
          );

          console.log("🔍 [DEBUG] getProjectActivity returned:", activity);

          // Always return success, even with empty activity array
          res.status(200).json({
            success: true,
            data: {
              activities: activity || [],
              total: Array.isArray(activity) ? activity.length : 0,
              limit: parseInt(limit as string) || 100,
              days: days ? parseInt(days as string) : undefined,
            },
          } as ApiResponse);
        } catch (sdkError) {
          console.error("SDK getProjectActivity error:", sdkError);
          // Fall back to database method if SDK fails
          const activity = await this.db.getProjectActivity(sanitizedId, {
            limit: parseInt(limit as string) || 100,
          });

          // Always return success, even with empty activity array
          res.status(200).json({
            success: true,
            data: {
              activities: activity || [],
              total: Array.isArray(activity) ? activity.length : 0,
              limit: parseInt(limit as string) || 100,
              days: days ? parseInt(days as string) : undefined,
            },
          } as ApiResponse);
        }
      } else {
        // Fall back to database method if SDK not available
        const activity = await this.db.getProjectActivity(sanitizedId, {
          limit: parseInt(limit as string) || 100,
        });

        // Always return success, even with empty activity array
        res.status(200).json({
          success: true,
          data: {
            activities: activity || [],
            total: Array.isArray(activity) ? activity.length : 0,
            limit: parseInt(limit as string) || 100,
            days: days ? parseInt(days as string) : undefined,
          },
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

      // Use SDK method for regenerating API key (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const newApiKey =
            await this.backendSDK.projects.regenerateProjectApiKey(sanitizedId);

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
        } catch (sdkError) {
          console.error("SDK regenerateProjectApiKey error:", sdkError);
          // Fall back to database method if SDK fails
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
        }
      } else {
        // Fall back to database method if SDK not available
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
      }
      return;
    } catch (error) {
      console.error("Regenerate API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to regenerate API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
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

      // Use SDK method for getting project settings (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const project = await this.backendSDK.projects.getProjectById(
            sanitizedId
          );

          if (project) {
            res.status(200).json({
              success: true,
              data: {
                ...project.settings,
                allowed_origins: project.allowed_origins || [],
              },
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("SDK getProjectSettings error:", sdkError);
          // Fall back to database method if SDK fails
          const project = await this.db.getProjectById(sanitizedId);

          if (project) {
            res.status(200).json({
              success: true,
              data: {
                ...project.settings,
                allowed_origins: project.allowed_origins || [],
              },
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const project = await this.db.getProjectById(sanitizedId);

        if (project) {
          res.status(200).json({
            success: true,
            data: {
              ...project.settings,
              allowed_origins: project.allowed_origins || [],
            },
          } as ApiResponse);
        } else {
          res.status(404).json({
            success: false,
            error: "Project not found",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Get project settings error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch project settings",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
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
      const { settings, allowed_origins } = req.body;

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

      // Use SDK method for updating project settings (SDK-first architecture)
      if (this.backendSDK) {
        try {
          // Map allowed_origins to cors_origins in settings
          const projectSettings: Partial<ProjectSettings> = {
            ...settings,
            cors_origins: allowed_origins,
          };

          const project = await this.backendSDK.projects.updateProjectSettings(
            sanitizedId,
            projectSettings
          );

          if (project) {
            res.status(200).json({
              success: true,
              data: {
                ...project.settings,
                allowed_origins: project.allowed_origins || [],
              },
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("SDK updateProjectSettings error:", sdkError);
          // Fall back to database method if SDK fails
          const project = await this.db.updateProject(sanitizedId, {
            settings,
            allowed_origins,
          });

          if (project) {
            res.status(200).json({
              success: true,
              data: {
                ...project.settings,
                allowed_origins: project.allowed_origins || [],
              },
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const project = await this.db.updateProject(sanitizedId, {
          settings,
          allowed_origins,
        });

        if (project) {
          res.status(200).json({
            success: true,
            data: {
              ...project.settings,
              allowed_origins: project.allowed_origins || [],
            },
          } as ApiResponse);
        } else {
          res.status(404).json({
            success: false,
            error: "Project not found",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Update project settings error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to update project settings",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
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
      const { projectId } = req.params;
      const { name, scopes, expires_at } = req.body;

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

      // Use SDK method for creating project API key (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const apiKey = await this.backendSDK.projects.createProjectApiKey(
            sanitizedId,
            {
              name,
              scopes,
              expires_at,
            }
          );

          if (apiKey) {
            res.status(201).json({
              success: true,
              data: apiKey,
            } as ApiResponse);
          } else {
            res.status(500).json({
              success: false,
              error: "Failed to create API key",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("SDK createProjectApiKey error:", sdkError);
          // Fall back to database method if SDK fails
          const apiKey = await this.db.createProjectApiKey({
            project_id: sanitizedId,
            name,
            scopes,
            expires_at,
            user_id: "system", // Use system user as fallback
          });

          if (apiKey) {
            res.status(201).json({
              success: true,
              data: apiKey,
            } as ApiResponse);
          } else {
            res.status(500).json({
              success: false,
              error: "Failed to create API key",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const apiKey = await this.db.createProjectApiKey({
          project_id: sanitizedId,
          name,
          scopes,
          expires_at,
          user_id: "system", // Use system user as fallback
        });

        if (apiKey) {
          res.status(201).json({
            success: true,
            data: apiKey,
          } as ApiResponse);
        } else {
          res.status(500).json({
            success: false,
            error: "Failed to create API key",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Create project API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to create project API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
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

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Use SDK method for getting project API keys (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const apiKeys = await this.backendSDK.projects.getProjectApiKeys(
            sanitizedId
          );

          if (apiKeys) {
            res.status(200).json({
              success: true,
              data: apiKeys,
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("SDK getProjectApiKeys error:", sdkError);
          // Fall back to database method if SDK fails
          const apiKeys = await this.db.getProjectApiKeys(sanitizedId);

          if (apiKeys) {
            res.status(200).json({
              success: true,
              data: apiKeys,
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const apiKeys = await this.db.getProjectApiKeys(sanitizedId);

        if (apiKeys) {
          res.status(200).json({
            success: true,
            data: apiKeys,
          } as ApiResponse);
        } else {
          res.status(404).json({
            success: false,
            error: "Project not found",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Get project API keys error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch project API keys",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
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

      // Use SDK method for deleting project API key (SDK-first architecture)
      if (this.backendSDK) {
        try {
          const success = await this.backendSDK.projects.deleteProjectApiKey(
            keyId
          );

          if (success) {
            res.status(200).json({
              success: true,
              message: "API key deleted successfully",
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "API key not found",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("SDK deleteProjectApiKey error:", sdkError);
          // Fall back to database method if SDK fails
          const result = await this.db.deleteProjectApiKey(keyId);

          if (result) {
            res.status(200).json({
              success: true,
              message: "API key deleted successfully",
            } as ApiResponse);
          } else {
            res.status(404).json({
              success: false,
              error: "API key not found",
            } as ApiResponse);
          }
        }
      } else {
        // Fall back to database method if SDK not available
        const result = await this.db.deleteProjectApiKey(keyId);

        if (result) {
          res.status(200).json({
            success: true,
            message: "API key deleted successfully",
          } as ApiResponse);
        } else {
          res.status(404).json({
            success: false,
            error: "API key not found",
          } as ApiResponse);
        }
      }
      return;
    } catch (error) {
      console.error("Delete project API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to delete project API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };
}

export default new ProjectController();
