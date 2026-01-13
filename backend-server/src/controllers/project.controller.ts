import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

// Project handlers
import { CreateProjectHandler } from "./handlers/project/create-project.handler";
import { DeleteProjectHandler } from "./handlers/project/delete-project.handler";
import { GetAllProjectsHandler } from "./handlers/project/get-all-projects.handler";
import { GetProjectActivityHandler } from "./handlers/project/get-project-activity.handler";
import { GetProjectByIdHandler } from "./handlers/project/get-project-by-id.handler";
import { GetProjectSettingsHandler } from "./handlers/project/get-project-settings.handler";
import { GetProjectStatsHandler } from "./handlers/project/get-project-stats.handler";
import { RegenerateProjectApiKeyHandler } from "./handlers/project/regenerate-project-api-key.handler";
import { UpdateProjectSettingsHandler } from "./handlers/project/update-project-settings.handler";
import { UpdateProjectStatsHandler } from "./handlers/project/update-project-stats.handler";
import { UpdateProjectHandler } from "./handlers/project/update-project.handler";

import { ApiResponse } from "@/types";

/**
 * Project Controller
 *
 * Handles all project-related HTTP requests including:
 * - Project CRUD operations
 * - Project settings management
 * - Project statistics
 * - API key regeneration
 * - Activity tracking
 *
 * Uses DatabaseService directly for all operations.
 * This controller delegates to specialized handlers for each operation.
 *
 * @class ProjectController
 * @example
 * const controller = new ProjectController();
 * // Controller is ready to handle project requests
 */
export class ProjectController {
  private _backendSDK?: BackendSDK;

  constructor() {
    // Don't initialize handlers in constructor - wait for setBackendSDK()
    // This allows ProjectController to be created before BackendSDK is initialized
  }

  /**
   * Set the BackendSDK instance for SDK-first architecture
   * @param {BackendSDK} sdk - The backend SDK instance
   */
  setBackendSDK(sdk: BackendSDK): void {
    this._backendSDK = sdk;
    // Reinitialize handlers with SDK
    this.initializeHandlers();
  }

  // Handlers
  private getAllProjectsHandler?: GetAllProjectsHandler;
  private createProjectHandler?: CreateProjectHandler;
  private getProjectByIdHandler?: GetProjectByIdHandler;
  private updateProjectHandler?: UpdateProjectHandler;
  private deleteProjectHandler?: DeleteProjectHandler;
  private regenerateProjectApiKeyHandler?: RegenerateProjectApiKeyHandler;
  private getProjectSettingsHandler?: GetProjectSettingsHandler;
  private getProjectStatsHandler?: GetProjectStatsHandler;
  private updateProjectSettingsHandler?: UpdateProjectSettingsHandler;
  private getProjectActivityHandler?: GetProjectActivityHandler;
  private updateProjectStatsHandler?: UpdateProjectStatsHandler;

  /**
   * Ensure handlers are initialized (lazy initialization)
   * Called before each handler method to ensure SDK is set
   */
  private ensureHandlersInitialized(): void {
    if (!this._backendSDK) {
      return; // SDK not set yet
    }
    if (!this.getAllProjectsHandler) {
      // Initialize all handlers if not already initialized
      this.initializeHandlers();
    }
  }

  /**
   * Initialize handlers with SDK
   * Called automatically when SDK is set or lazily when handlers are needed
   */
  private initializeHandlers(): void {
    if (!this._backendSDK) {
      // SDK not set yet - handlers will be initialized when setBackendSDK() is called
      return;
    }

    // Initialize handlers with SDK (SDK-first architecture)
    this.getAllProjectsHandler = new GetAllProjectsHandler(this._backendSDK);
    this.createProjectHandler = new CreateProjectHandler(this._backendSDK);
    this.getProjectByIdHandler = new GetProjectByIdHandler(this._backendSDK);
    this.updateProjectHandler = new UpdateProjectHandler(this._backendSDK);
    this.deleteProjectHandler = new DeleteProjectHandler(this._backendSDK);
    this.regenerateProjectApiKeyHandler = new RegenerateProjectApiKeyHandler(this._backendSDK);
    this.getProjectSettingsHandler = new GetProjectSettingsHandler(this._backendSDK);
    this.getProjectStatsHandler = new GetProjectStatsHandler(this._backendSDK);
    this.updateProjectSettingsHandler = new UpdateProjectSettingsHandler(this._backendSDK);
    this.getProjectActivityHandler = new GetProjectActivityHandler(this._backendSDK);
    this.updateProjectStatsHandler = new UpdateProjectStatsHandler(this._backendSDK);
  }

  // Core project operations - delegate to handlers
  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.getAllProjectsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getAllProjectsHandler.handle(req, res);
  };

  createProject = async (req: Request, res: Response): Promise<void> => {
    if (!this.createProjectHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.createProjectHandler.handle(req, res);
  };

  getProjectById = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.getProjectByIdHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getProjectByIdHandler.handle(req, res);
  };

  updateProject = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.updateProjectHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.updateProjectHandler.handle(req, res);
  };

  deleteProject = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.deleteProjectHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.deleteProjectHandler.handle(req, res);
  };

  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.regenerateProjectApiKeyHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.regenerateProjectApiKeyHandler.handle(req, res);
  };

  // Project settings - delegate to handlers
  getProjectSettings = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.getProjectSettingsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getProjectSettingsHandler.handle(req, res);
  };

  updateProjectSettings = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.updateProjectSettingsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.updateProjectSettingsHandler.handle(req, res);
  };

  // Project statistics - delegate to handlers
  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.getProjectStatsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getProjectStatsHandler.handle(req, res);
  };

  updateProjectStats = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.updateProjectStatsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.updateProjectStatsHandler.handle(req, res);
  };

  // Project activity - delegate to handlers
  getProjectActivity = async (req: Request, res: Response): Promise<void> => {
    if (!this._backendSDK) {
      res.status(503).json({
        success: false,
        error: "BackendSDK not initialized - service starting up",
      } as ApiResponse);
      return;
    }
    this.ensureHandlersInitialized();
    if (!this.getProjectActivityHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getProjectActivityHandler.handle(req, res);
  };

  /**
   * Create a new API key for a project
   */
  createProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const { name, scopes, expiresAt } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!this._backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      const apiKey = await this._backendSDK.projects.createProjectApiKey(projectId, {
        name,
        scopes,
        expires_at: expiresAt,
      });

      res.json({
        success: true,
        data: apiKey,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create API key",
      } as ApiResponse);
    }
  };

  /**
   * Get all API keys for a project
   */
  getProjectApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!this._backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Use apiKeys.getAll() instead of projects.getProjectApiKeys() which may not exist
      const apiKeys = await this._backendSDK.apiKeys.getAll(projectId);

      res.json({
        success: true,
        data: apiKeys,
      } as ApiResponse);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === "string" 
          ? error 
          : "Failed to get API keys";
      
      console.error("[ProjectController] Error getting API keys:", errorMessage, error);
      
      res.status(500).json({
        success: false,
        error: String(errorMessage),
      } as ApiResponse);
    }
  };

  /**
   * Delete an API key from a project
   */
  deleteProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKeyId = req.params.apiKeyId;

      if (!apiKeyId) {
        res.status(400).json({
          success: false,
          error: "API Key ID is required",
        } as ApiResponse);
        return;
      }

      if (!this._backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // SDK projects.deleteProjectApiKey only takes keyId - project context is implicit
      await this._backendSDK.projects.deleteProjectApiKey(apiKeyId);

      res.json({
        success: true,
        message: "API key deleted successfully",
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete API key",
      } as ApiResponse);
    }
  };
}
