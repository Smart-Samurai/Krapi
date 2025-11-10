import { BackendSDK, ProjectSettings } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";
import { AuthenticatedRequest, ApiResponse } from "@/types";
import { getDefaultCollections } from "@/utils/default-collections";
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
   * Create default collections for a new project
   * Called automatically after project creation
   */
  private async createDefaultCollections(
    projectId: string,
    createdBy: string
  ): Promise<void> {
    if (!this.backendSDK) {
      console.warn("BackendSDK not available, cannot create default collections");
      return;
    }

    const defaultCollections = getDefaultCollections();

    for (const collectionSchema of defaultCollections) {
      try {
        // Check if collection already exists (shouldn't happen for new projects, but safe check)
        const existing = await this.backendSDK.getCollection(projectId, collectionSchema.name);
        if (existing) {
          console.log(
            `Default collection "${collectionSchema.name}" already exists in project ${projectId}, skipping`
          );
          continue;
        }

        // Create the collection using BackendSDK
        await this.backendSDK.createCollection(
          projectId,
          collectionSchema.name,
          {
            description: collectionSchema.description,
            fields: collectionSchema.fields.map((f) => ({
              name: f.name,
              type: f.type as string,
              required: f.required ?? false,
              unique: f.unique ?? false,
              indexed: f.indexed ?? false,
              default: f.default,
              description: f.description,
            })),
            indexes: collectionSchema.indexes || [],
          },
          createdBy
        );

        console.log(
          `✅ Created default collection "${collectionSchema.name}" for project ${projectId}`
        );
      } catch (error) {
        // Log error but don't fail project creation if default collection creation fails
        console.error(
          `⚠️ Failed to create default collection "${collectionSchema.name}" for project ${projectId}:`,
          error
        );
        // Continue with other default collections
      }
    }
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
            // Create default collections for the new project
            try {
              await this.createDefaultCollections(project.id, currentUser.id);
            } catch (collectionsError) {
              // Log error but don't fail project creation if default collections fail
              console.error(
                `⚠️ Failed to create default collections for project ${project.id}:`,
                collectionsError
              );
            }

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
            message: sdkError instanceof Error ? sdkError.message : String(sdkError),
            stack: sdkError instanceof Error ? sdkError.stack : undefined,
            name: sdkError instanceof Error ? sdkError.name : "Unknown",
          });
          // Fall back to database method if SDK fails
          const project = await this.db.createProject({
            name,
            description,
            settings,
            allowed_origins: [],
            created_by: currentUser.id, // Required for owner_id
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
          created_by: currentUser.id, // Required for owner_id
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

  /**
   * Update an existing project
   * 
   * PUT /krapi/k1/projects/:projectId
   * 
   * Updates project information. Requires authentication and projects:write scope.
   * 
   * @param {Request} req - Express request with projectId in params and updates in body
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If update fails
   * 
   * @example
   * // Request: PUT /krapi/k1/projects/project-id
   * // Body: { name: 'Updated Name', description: 'Updated description' }
   * // Response: { success: true, data: {...} }
   */
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
          console.log("🔍 [PROJECT DEBUG] Updating project:", sanitizedId, "with updates:", updates);
          const project = await this.backendSDK.projects.updateProject(
            sanitizedId,
            updates
          );

          if (project) {
            console.log("✅ [PROJECT DEBUG] Project updated successfully:", project.id);
            res.status(200).json({
              success: true,
              data: project,
            } as ApiResponse);
          } else {
            console.error("❌ [PROJECT DEBUG] Project not found after update");
            res.status(404).json({
              success: false,
              error: "Project not found",
            } as ApiResponse);
          }
        } catch (sdkError) {
          console.error("❌ [PROJECT DEBUG] SDK updateProject error:", sdkError);
          // Fall back to database method if SDK fails
          const project = await this.db.updateProject(sanitizedId, updates);

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
        const project = await this.db.updateProject(sanitizedId, updates);

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

  /**
   * Delete a project
   * 
   * DELETE /krapi/k1/projects/:projectId
   * 
   * Deletes a project. Requires authentication and projects:delete scope.
   * 
   * @param {Request} req - Express request with projectId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If deletion fails
   * 
   * @example
   * // Request: DELETE /krapi/k1/projects/project-id
   * // Response: { success: true, message: 'Project deleted successfully' }
   */
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
          const success = await this.db.deleteProject(sanitizedId);

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
        const success = await this.db.deleteProject(sanitizedId);

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

  /**
   * Get project statistics
   * 
   * GET /krapi/k1/projects/:projectId/stats
   * 
   * Retrieves statistics for a project including collections, documents, users, storage, etc.
   * Requires authentication and projects:read scope.
   * 
   * @param {Request} req - Express request with projectId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If retrieval fails
   * 
   * @example
   * // Request: GET /krapi/k1/projects/project-id/stats
   * // Response: { success: true, data: { totalCollections: 5, totalDocuments: 100, ... } }
   */
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
              ...stats, // Include any additional stats first
              totalCollections: stats.totalCollections || 0,
              totalDocuments: stats.totalDocuments || 0,
              totalUsers: 0, // Not available in SDK stats, default to 0
              storageUsed: stats.storageUsed || 0,
              apiCalls: stats.apiCallsToday || 0,
              lastActivity: stats.lastActivity || null,
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
            const { totalCollections, totalDocuments, totalUsers, storageUsed, ...restStats } = stats;
            const transformedStats = {
              totalCollections: totalCollections || 0,
              totalDocuments: totalDocuments || 0,
              totalUsers: totalUsers || 0,
              storageUsed: storageUsed || 0,
              apiCalls: stats.apiCallsCount || 0,
              lastActivity: stats.lastApiCall || null,
              ...restStats, // Include any additional stats
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
          const { totalCollections, totalDocuments, totalUsers, storageUsed, ...restStats } = stats;
          const transformedStats = {
            totalCollections: totalCollections || 0,
            totalDocuments: totalDocuments || 0,
            totalUsers: totalUsers || 0,
            storageUsed: storageUsed || 0,
            apiCalls: stats.apiCallsCount || 0,
            lastActivity: stats.lastApiCall || null,
            ...restStats, // Include any additional stats
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

  /**
   * Get project activity logs
   * 
   * GET /krapi/k1/projects/:projectId/activity
   * 
   * Retrieves activity logs for a project with optional filtering by days.
   * Requires authentication and projects:read scope.
   * 
   * @param {Request} req - Express request with projectId in params and optional query params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {500} If retrieval fails
   * 
   * @example
   * // Request: GET /krapi/k1/projects/project-id/activity?limit=50&days=7
   * // Response: { success: true, data: { activities: [...], total: 10, limit: 50, days: 7 } }
   */
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
              ...(days ? { days: parseInt(days as string) } : {}),
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

  /**
   * Regenerate project API key
   * 
   * POST /krapi/k1/projects/:projectId/api-keys/regenerate
   * 
   * Regenerates the main API key for a project. Requires authentication and projects:write scope.
   * 
   * @param {Request} req - Express request with projectId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {401} If user is not authenticated
   * @throws {404} If project is not found
   * @throws {500} If regeneration fails
   * 
   * @example
   * // Request: POST /krapi/k1/projects/project-id/api-keys/regenerate
   * // Response: { success: true, data: { apiKey: 'pk_...' }, message: 'API key regenerated successfully' }
   */
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

  /**
   * Get project settings
   * 
   * GET /krapi/k1/projects/:projectId/settings
   * 
   * Retrieves current settings for a project. Requires authentication and projects:read scope.
   * 
   * @param {Request} req - Express request with projectId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If retrieval fails
   * 
   * @example
   * // Request: GET /krapi/k1/projects/project-id/settings
   * // Response: { success: true, data: { authentication_required: true, ... } }
   */
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
   * 
   * PUT /krapi/k1/projects/:projectId/settings
   * 
   * Updates settings for a project. Requires authentication and projects:write scope.
   * 
   * @param {Request} req - Express request with projectId in params and settings/allowed_origins in body
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If update fails
   * 
   * @example
   * // Request: PUT /krapi/k1/projects/project-id/settings
   * // Body: { settings: { authentication_required: true }, allowed_origins: ['https://example.com'] }
   * // Response: { success: true, data: { authentication_required: true, ... } }
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

  /**
   * Create project API key
   * 
   * POST /krapi/k1/projects/:projectId/api-keys
   * 
   * Creates a new API key for a project. Requires authentication and projects:write scope.
   * 
   * @param {Request} req - Express request with projectId in params and API key data in body
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {500} If API key creation fails
   * 
   * @example
   * // Request: POST /krapi/k1/projects/project-id/api-keys
   * // Body: { name: 'My API Key', scopes: ['documents:read'], expires_at: '2024-12-31' }
   * // Response: { success: true, data: { id: '...', key: 'pk_...', ... } }
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

  /**
   * Get project API keys
   * 
   * GET /krapi/k1/projects/:projectId/api-keys
   * 
   * Retrieves all API keys for a project. Requires authentication and projects:read scope.
   * 
   * @param {Request} req - Express request with projectId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If project is not found
   * @throws {500} If retrieval fails
   * 
   * @example
   * // Request: GET /krapi/k1/projects/project-id/api-keys
   * // Response: { success: true, data: [{ id: '...', name: '...', ... }, ...] }
   */
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
   * 
   * DELETE /krapi/k1/projects/:projectId/api-keys/:keyId
   * 
   * Deletes an API key for a project. Requires authentication and projects:write scope.
   * 
   * @param {Request} req - Express request with projectId and keyId in params
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {400} If project ID is invalid
   * @throws {404} If API key is not found
   * @throws {500} If deletion fails
   * 
   * @example
   * // Request: DELETE /krapi/k1/projects/project-id/api-keys/key-id
   * // Response: { success: true, message: 'API key deleted successfully' }
   */
  deleteProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, keyId } = req.params;
      if (!keyId) {
        res.status(400).json({
          success: false,
          error: "Key ID is required",
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
            keyId!
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
          const result = await this.db.deleteProjectApiKey(keyId!);

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
