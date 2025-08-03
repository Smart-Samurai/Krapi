import { Request, Response } from "express";
import { DatabaseService } from "@/services/database.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  PaginatedResponse,
  Project,
  ChangeAction,
} from "@/types";
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

      const projects = await this.db.getAllProjects();

      // Simple pagination
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
          hasNext: pageNum < Math.ceil(projects.length / limitNum),
          hasPrev: pageNum > 1,
        },
      } as PaginatedResponse<Project>);
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

      const project = await this.db.getProjectById(sanitizedId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
          code: "PROJECT_NOT_FOUND",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: project,
      } as ApiResponse<Project>);
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

  // Create project
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { name, description, settings = {} } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        } as ApiResponse);
        return;
      }

      // Validate input
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Project name is required",
          code: "INVALID_INPUT",
        } as ApiResponse);
        return;
      }

      // Create project
      const newProject = await this.db.createProject({
        name: name.trim(),
        description: description?.trim() || null,
        settings,
        created_by: currentUser.id,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        api_key: `krapi_${require("uuid").v4().replace(/-/g, "")}`,
      });

      // Log the action
      await this.db.createChangelogEntry({
        project_id: newProject.id,
        entity_type: "project",
        entity_id: newProject.id,
        action: ChangeAction.CREATED,
        changes: { name, description },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: newProject,
        message: "Project created successfully. API Key: " + newProject.api_key,
      } as ApiResponse<Project>);
      return;
    } catch (error) {
      console.error("Create project error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");
      const isDuplicateError =
        errorMessage.includes("duplicate") || errorMessage.includes("unique");

      res.status(isDuplicateError ? 409 : isDbError ? 503 : 500).json({
        success: false,
        error: isDuplicateError
          ? "Project name already exists"
          : "Failed to create project",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDuplicateError
          ? "DUPLICATE_NAME"
          : isDbError
          ? "DATABASE_ERROR"
          : "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId } = req.params;
      const updates = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const existingProject = await this.db.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Update project
      const updatedProject = await this.db.updateProject(projectId, updates);

      if (!updatedProject) {
        res.status(500).json({
          success: false,
          error: "Failed to update project",
        } as ApiResponse);
        return;
      }

      // Log the action
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== existingProject[key as keyof Project]) {
          changes[key] = {
            old: existingProject[key as keyof Project],
            new: updates[key],
          };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: "project",
          entity_id: projectId,
          action: ChangeAction.UPDATED,
          changes,
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
          created_at: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        data: updatedProject,
      } as ApiResponse<Project>);
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

      // Check if project exists
      const existingProject = await this.db.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Delete project
      const deleted = await this.db.deleteProject(projectId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete project",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "project",
        entity_id: projectId,
        action: ChangeAction.DELETED,
        changes: { name: existingProject.name },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      } as ApiResponse);
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

      // Check if project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Get stats
      const tables = await this.db.getProjectTableSchemas(projectId);
      const users = await this.db.getProjectUsers(projectId);
      const files = await this.db.getProjectFiles(projectId);

      // Calculate document count
      let documentCount = 0;
      for (const table of tables) {
        const { total } = await this.db.getDocumentsByTable(table.id);
        documentCount += total;
      }

      const stats = {
        tables: tables.length,
        documents: documentCount,
        users: users.total,
        files: files.length,
        storage_used: files.reduce((sum, file) => sum + file.size, 0),
      };

      res.status(200).json({
        success: true,
        data: stats,
      } as ApiResponse);
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
      const { limit = 50 } = req.query;

      // Check if project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Get changelog entries for this project
      const activities = await this.db.getProjectChangelog(
        projectId,
        parseInt(limit as string) || 100
      );

      res.status(200).json({
        success: true,
        data: activities,
      } as ApiResponse);
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

      // Check if project exists
      const existingProject = await this.db.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const newApiKey = `krapi_${require("uuid").v4().replace(/-/g, "")}`;

      // Update project with new API key
      const updatedProject = await this.db.updateProject(projectId, {
        api_key: newApiKey,
      });

      if (!updatedProject) {
        res.status(500).json({
          success: false,
          error: "Failed to regenerate API key",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "project",
        entity_id: projectId,
        action: ChangeAction.UPDATED,
        changes: { api_key: "regenerated" },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: { api_key: newApiKey },
        message: "API key regenerated successfully",
      } as ApiResponse);
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

      const project = await this.db.getProjectById(projectId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: project.settings || {},
      } as ApiResponse);
    } catch (error) {
      console.error("Get project settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project settings",
      } as ApiResponse);
    }
  };

  // Update project settings
  updateProjectSettings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId } = req.params;
      const settings = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const existingProject = await this.db.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Update project settings
      const updatedProject = await this.db.updateProject(projectId, {
        settings,
      });

      if (!updatedProject) {
        res.status(500).json({
          success: false,
          error: "Failed to update project settings",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "project",
        entity_id: projectId,
        action: ChangeAction.UPDATED,
        changes: { settings: { old: existingProject.settings, new: settings } },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: updatedProject.settings,
      } as ApiResponse);
    } catch (error) {
      console.error("Update project settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update project settings",
      } as ApiResponse);
    }
  };

  // Create project API key
  createProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId } = req.params;
      const { name, scopes } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const apiKey = `krapi_${require("uuid").v4().replace(/-/g, "")}`;

      // Create API key entry
      const newApiKey = await this.db.createProjectApiKey({
        project_id: projectId,
        name,
        key: apiKey,
        scopes: scopes || [],
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        last_used_at: null,
        active: true,
      });

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "api_key",
        entity_id: newApiKey.id,
        action: ChangeAction.CREATED,
        changes: { name, scopes },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: newApiKey,
        message: "API key created successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Create project API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      } as ApiResponse);
    }
  };

  // Get project API keys
  getProjectApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Check if project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Get API keys for the project
      const apiKeys = await this.db.getProjectApiKeys(projectId);

      // Remove the actual key values for security
      const sanitizedKeys = apiKeys.map((key) => ({
        ...key,
        key: key.key.substring(0, 10) + "...", // Show only first 10 chars
      }));

      res.status(200).json({
        success: true,
        data: sanitizedKeys,
      } as ApiResponse);
    } catch (error) {
      console.error("Get project API keys error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API keys",
      } as ApiResponse);
    }
  };

  // Delete project API key
  deleteProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { projectId, keyId } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Check if API key exists
      const apiKey = await this.db.getProjectApiKeyById(keyId);
      if (!apiKey || apiKey.owner_id !== projectId) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        } as ApiResponse);
        return;
      }

      // Delete API key
      const deleted = await this.db.deleteProjectApiKey(keyId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete API key",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "api_key",
        entity_id: keyId,
        action: ChangeAction.DELETED,
        changes: { name: apiKey.name },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        created_at: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        message: "API key deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Delete project API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
      } as ApiResponse);
    }
  };
}

export default new ProjectController();
