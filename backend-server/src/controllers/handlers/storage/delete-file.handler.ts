import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for deleting a file
 * DELETE /krapi/k1/projects/:projectId/storage/files/:fileId
 */
export class DeleteFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, fileId } = req.params;
      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Check if file exists using SDK
      const file = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Delete file using SDK storage.deleteFile() method
      const deletedBy = authReq.user?.id || authReq.session?.user_id || "system";
      const permanent = req.query.permanent === "true";
      await this.backendSDK.storage.deleteFile(projectId, fileId, deletedBy, permanent);

      // Log action using SDK changelog service
      await this.backendSDK.changelog.create({
        entity_type: "file",
        entity_id: fileId,
        action: "deleted",
        changes: { filename: file.original_name },
        user_id: authReq.user?.id || authReq.session?.user_id || "system",
        ...(authReq.session?.id && { session_id: authReq.session.id }),
      });

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete file",
      } as ApiResponse);
    }
  }
}


