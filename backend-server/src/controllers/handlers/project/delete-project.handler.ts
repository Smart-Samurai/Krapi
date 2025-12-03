import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for deleting a project
 * DELETE /krapi/k1/projects/:projectId
 * 
 * Uses SDK projects.deleteProject() method for project deletion.
 */
export class DeleteProjectHandler {
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

      // Use SDK projects.deleteProject() method
      const deleted = await this.backendSDK.projects.deleteProject(sanitizedId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete project",
      } as ApiResponse);
    }
  }
}

