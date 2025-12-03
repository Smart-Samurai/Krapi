import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for getting project statistics
 * GET /krapi/k1/projects/:projectId/stats
 * 
 * Uses SDK projects.getProjectStatistics() method for consistent architecture.
 */
export class GetProjectStatsHandler {
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

      // Use SDK projects.getProjectStatistics() method
      const stats = await this.backendSDK.projects.getProjectStatistics(sanitizedId);

      res.status(200).json({
        success: true,
        data: stats,
      } as ApiResponse);
    } catch (error) {
      console.error("Get project stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project statistics",
      } as ApiResponse);
    }
  }
}

