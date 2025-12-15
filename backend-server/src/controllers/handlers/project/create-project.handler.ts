import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest, ApiResponse } from "@/types";
import { sendSdkErrorResponse } from "@/utils/error-utils";

/**
 * Handler for creating a new project
 * POST /krapi/k1/projects
 * 
 * Uses SDK projects.createProject() method for consistent architecture.
 */
export class CreateProjectHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      const isProduction = process.env.NODE_ENV === "production";
      const projectCreationEnabled = process.env.ENABLE_PROJECT_CREATION === "true" || process.env.ALLOW_PROJECT_CREATION === "true";

      if (isProduction && !projectCreationEnabled) {
        res.status(403).json({
          success: false,
          error: "Project creation is not enabled in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { name, description, settings, allowed_origins } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Project name is required",
        } as ApiResponse);
        return;
      }

      // Use SDK projects.createProject() method
      // SDK requires ownerId and CreateProjectRequest
      const ownerId = currentUser.id || "system";
      
      const project = await this.backendSDK.projects.createProject(ownerId, {
        name,
        description: description || undefined,
        allowed_origins: allowed_origins || ["localhost"],
        settings: {
          public: false,
          allow_registration: false,
          require_email_verification: false,
          max_file_size: 10485760,
          allowed_file_types: ["*"],
          authentication_required: true,
          cors_enabled: true,
          rate_limiting_enabled: false,
          logging_enabled: true,
          encryption_enabled: false,
          backup_enabled: false,
          custom_headers: {},
          environment: "development" as const,
          ...settings,
        },
      });

      res.status(201).json({
        success: true,
        data: project,
        message: "Project created successfully",
      } as ApiResponse);
    } catch (error) {
      sendSdkErrorResponse(res, error, "createProject");
    }
  }
}

