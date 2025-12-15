import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for getting file versions
 * GET /krapi/k1/projects/:projectId/files/:fileId/versions
 * 
 * Uses SDK storage.getFileVersions() method for version retrieval.
 */
export class GetFileVersionsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, fileId } = req.params;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        } as ApiResponse);
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Use SDK storage.getFileVersions() method
      const versions = await this.backendSDK.storage.getFileVersions(fileId);

      res.json({
        success: true,
        data: versions,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting file versions:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get file versions",
      } as ApiResponse);
    }
  }
}

