import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for making a file public
 * POST /krapi/k1/projects/:projectId/files/:fileId/make-public
 * 
 * Uses SDK storage.updateFile() method to set is_public to true.
 */
export class MakeFilePublicHandler {
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

      // Use SDK storage.updateFile() to make file public
      const publicFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { is_public: true },
        updatedBy
      );

      if (!publicFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: publicFile,
        message: "File made public successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error making file public:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to make file public",
      } as ApiResponse);
    }
  }
}

