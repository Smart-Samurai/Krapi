import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for updating project settings
 * PUT /krapi/k1/projects/:projectId/settings
 * 
 * Uses SDK projects.updateProjectSettings() method for consistent architecture.
 */
export class UpdateProjectSettingsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { settings, allowed_origins } = req.body;

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
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

      // Use SDK projects.updateProjectSettings() method
      // If allowed_origins is provided, we need to update project separately
      let updatedProject;
      if (allowed_origins !== undefined) {
        // Update both settings and allowed_origins
        updatedProject = await this.backendSDK.projects.updateProject(sanitizedId, {
          settings,
          allowed_origins,
        });
      } else {
        // Update only settings
        updatedProject = await this.backendSDK.projects.updateProjectSettings(sanitizedId, settings);
      }

      if (!updatedProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...(updatedProject.settings || {}),
          allowed_origins: (updatedProject as { allowed_origins?: string[] }).allowed_origins || [],
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Update project settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update project settings",
      } as ApiResponse);
    }
  }
}
