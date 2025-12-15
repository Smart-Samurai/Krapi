import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "@/types";

/**
 * Handler for getting storage statistics
 * GET /krapi/k1/projects/:projectId/storage/stats
 * 
 * Uses SDK storage.getStorageStatistics() method for statistics retrieval.
 */
export class GetStorageStatsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      // Use SDK storage.getStorageStatistics() method
      const stats = await this.backendSDK.storage.getStorageStatistics(projectId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting storage stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get storage statistics",
      });
    }
  }
}


