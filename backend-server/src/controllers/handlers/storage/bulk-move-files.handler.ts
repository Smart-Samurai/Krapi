import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for bulk moving files
 * POST /krapi/k1/projects/:projectId/files/bulk/move
 * 
 * Uses SDK storage.updateFile() method in a loop for bulk move operations.
 */
export class BulkMoveFilesHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileIds, destinationFolderId } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!Array.isArray(fileIds) || fileIds.length === 0 || !destinationFolderId) {
        res.status(400).json({
          success: false,
          error: "File IDs array and destination folder ID are required",
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

      const authReq = req as AuthenticatedRequest;
      const updatedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Use SDK storage.updateFile() for each file to move (change folder_id)
      let movedCount = 0;
      const errors: string[] = [];

      for (const fileId of fileIds) {
        try {
          const updated = await this.backendSDK.storage.updateFile(
            projectId,
            fileId,
            { folder_id: destinationFolderId },
            updatedBy
          );
          if (updated) movedCount++;
        } catch (error) {
          errors.push(`Failed to move file ${fileId}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      res.json({
        success: true,
        data: {
          moved: movedCount,
          failed: fileIds.length - movedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `${movedCount} files moved successfully`,
      } as ApiResponse);
    } catch (error) {
      console.error("Error bulk moving files:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to bulk move files",
      } as ApiResponse);
    }
  }
}

