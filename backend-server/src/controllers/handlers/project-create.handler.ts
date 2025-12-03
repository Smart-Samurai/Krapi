import { Request, Response } from "express";

import { ProjectOperationsService } from "@/services/project-operations.service";
import { AuthenticatedRequest, ApiResponse } from "@/types";
import {
  sendErrorResponse,
  sendValidationErrorResponse,
  sendUnauthorizedResponse,
} from "@/utils/error-handlers";

/**
 * Type for createDefaultCollections method to avoid circular dependency
 */
type CreateDefaultCollectionsFn = (projectId: string, createdBy: string) => Promise<void>;

/**
 * Project Create Handler
 * 
 * Handles POST /krapi/k1/projects - Create a new project
 * 
 * Separated from controller for better organization and debugging.
 * This is where we suspect the "Project ID is required" error might be coming from.
 */
export class ProjectCreateHandler {
  constructor(
    private projectOps: ProjectOperationsService,
    private createDefaultCollections?: CreateDefaultCollectionsFn
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      console.log("🔍 [PROJECT CREATE HANDLER] Request received", {
        method: req.method,
        url: req.url,
        path: req.path,
        headers: {
          "x-project-id": req.headers["x-project-id"],
          authorization: req.headers.authorization ? "present" : "missing",
        },
        body: req.body,
      });

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        console.log("❌ [PROJECT CREATE HANDLER] No user in request");
        sendUnauthorizedResponse(res);
        return;
      }

      const { name, description, settings } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        console.log("❌ [PROJECT CREATE HANDLER] Invalid project name");
        sendValidationErrorResponse(res, "Project name is required");
        return;
      }

      console.log("🔍 [PROJECT CREATE HANDLER] Calling projectOps.createProject", {
        userId: currentUser.id,
        projectName: name,
      });

      const project = await this.projectOps.createProject(authReq, {
        name: name.trim(),
        description: description?.trim(),
        settings,
      });

      console.log("✅ [PROJECT CREATE HANDLER] Project created successfully", {
        projectId: project?.id,
      });

      // Create default collections for the new project
      const projectId = (project as { id?: string })?.id;
      if (projectId && this.createDefaultCollections) {
        try {
          await this.createDefaultCollections(projectId, currentUser.id);
        } catch (collectionsError) {
          // Log error but don't fail project creation if default collections fail
          console.error(
            `⚠️ [PROJECT CREATE HANDLER] Failed to create default collections for project ${projectId}:`,
            collectionsError
          );
        }
      }

      // Response format: frontend/test expects { success: true, project: {...} }
      res.status(201).json({
        success: true,
        data: project,
        project, // Also include for backward compatibility
      } as ApiResponse);
    } catch (error) {
      console.error("❌ [PROJECT CREATE HANDLER] Error creating project:", error);
      
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("Unauthorized")) {
        sendUnauthorizedResponse(res);
        return;
      }
      
      if (errorMessage.includes("required") || errorMessage.includes("invalid")) {
        sendValidationErrorResponse(res, errorMessage);
        return;
      }

      sendErrorResponse(res, error, "Failed to create project");
    }
  }
}

