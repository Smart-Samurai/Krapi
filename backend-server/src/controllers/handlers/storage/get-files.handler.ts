import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for getting all files for a project
 * GET /krapi/k1/projects/:projectId/storage/files
 * 
 * Uses SDK storage.getAllFiles() method for file retrieval.
 */
export class GetFilesHandler {
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

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Verify project exists using SDK
      try {
        await this.backendSDK.projects.getProjectById(projectId);
      } catch {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Get query parameters for filtering/pagination
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const includeDeleted = req.query.include_deleted === "true";

      // Use SDK storage.getAllFiles() method
      const fileOptions: { limit?: number; offset?: number; include_deleted?: boolean } = {
        include_deleted: includeDeleted,
      };
      if (limit !== undefined) {
        fileOptions.limit = limit;
      }
      if (offset !== undefined) {
        fileOptions.offset = offset;
      }
      const files = await this.backendSDK.storage.getAllFiles(projectId, fileOptions);

      // Map to response format
      const fileData = files.map((file) => ({
        id: file.id,
        filename: file.original_name,
        size: file.file_size,
        mime_type: file.mime_type,
        uploaded_at: file.created_at,
        uploaded_by: file.uploaded_by,
      }));

      res.status(200).json({
        success: true,
        data: fileData,
      } as ApiResponse);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch files",
      } as ApiResponse);
    }
  }
}


