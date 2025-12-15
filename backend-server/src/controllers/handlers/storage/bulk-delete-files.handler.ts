import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for bulk deleting files
 * DELETE /krapi/k1/projects/:projectId/files/bulk
 * 
 * Uses SDK storage.deleteFile() method in a loop for bulk deletion.
 */
export class BulkDeleteFilesHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileIds, permanent } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "File IDs array is required",
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
      const deletedBy = authReq.user?.id || authReq.session?.user_id || "system";
      const isPermanent = permanent === true || permanent === "true";

      // Use SDK storage.deleteFile() for each file
      let deletedCount = 0;
      const errors: string[] = [];

      for (const fileId of fileIds) {
        try {
          await this.backendSDK.storage.deleteFile(projectId, fileId, deletedBy, isPermanent);
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete file ${fileId}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      res.json({
        success: true,
        data: {
          deleted: deletedCount,
          failed: fileIds.length - deletedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `${deletedCount} files deleted successfully`,
      } as ApiResponse);
    } catch (error) {
      console.error("Error bulk deleting files:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to bulk delete files",
      } as ApiResponse);
    }
  }
}

