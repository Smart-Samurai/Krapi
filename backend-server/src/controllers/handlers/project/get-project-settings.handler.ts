import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for getting project settings
 * GET /krapi/k1/projects/:projectId/settings
 * 
 * Uses SDK projects.getProjectById() method and extracts settings for consistent architecture.
 */
export class GetProjectSettingsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

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

      // Use SDK projects.getProjectById() method and extract settings
      const project = await this.backendSDK.projects.getProjectById(sanitizedId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...(project.settings || {}),
          allowed_origins: (project as { allowed_origins?: string[] }).allowed_origins || [],
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Get project settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project settings",
      } as ApiResponse);
    }
  }
}

