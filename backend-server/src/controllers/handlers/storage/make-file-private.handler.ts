import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for making a file private
 * POST /krapi/k1/projects/:projectId/files/:fileId/make-private
 * 
 * Uses SDK storage.updateFile() method to set is_public to false.
 */
export class MakeFilePrivateHandler {
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

      const authReq = req as AuthenticatedRequest;
      const updatedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Use SDK storage.updateFile() to make file private
      const privateFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { is_public: false },
        updatedBy
      );

      if (!privateFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: privateFile,
        message: "File made private successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error making file private:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to make file private",
      } as ApiResponse);
    }
  }
}

