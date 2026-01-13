import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";
import { ApiResponse } from "@/types";

/**
 * Handler for restoring a file version
 * POST /krapi/k1/projects/:projectId/files/:fileId/versions/:versionId/restore
 */
export class RestoreFileVersionHandler {
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

      const { projectId, fileId, versionId } = req.params;

      if (!projectId || !fileId || !versionId) {
        res.status(400).json({
          success: false,
          error: "Project ID, file ID, and version ID are required",
        } as ApiResponse);
        return;
      }

      // Verify version exists using SDK
      const versions = await this.backendSDK.storage.getFileVersions(fileId);
      const version = versions.find((v) => v.id === versionId);
      
      if (!version) {
        res.status(404).json({
          success: false,
          error: "File version not found",
        } as ApiResponse);
        return;
      }

      // SDK doesn't have restoreFileVersion method, so use DatabaseService directly
      const dbService = DatabaseService.getInstance();
      const restoredFile = await dbService.restoreFileVersion(projectId, fileId, versionId);

      res.json({
        success: true,
        data: restoredFile,
        message: "File version restored successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error restoring file version:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to restore file version",
      } as ApiResponse);
    }
  }
}

