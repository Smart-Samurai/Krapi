import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "@/types";

/**
 * Handler for uploading a file
 * POST /storage/upload
 */
export class UploadFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file provided" });
        return;
      }

      const { project_id } = req.body;
      const projectId = project_id || (req.params as Record<string, string>).projectId;

      if (!projectId) {
        res.status(400).json({ success: false, error: "Project ID is required" });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { folder } = req.body;
      const authReq = req as AuthenticatedRequest;

      // Backend SDK in server mode expects: uploadFile(projectId, fileData, fileBuffer)
      // where fileData is metadata and fileBuffer is the actual file content
      const uploadRequest = {
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype || 'application/octet-stream',
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
        uploaded_by: authReq.user?.id || "system",
        folder_id: folder || undefined,
      };

      // Use backend SDK storage service directly (server mode)
      const storageService = this.backendSDK.storage as unknown as {
        uploadFile: (projectId: string, fileData: unknown, fileBuffer: Buffer) => Promise<unknown>;
      };

      const fileInfo = await storageService.uploadFile(projectId, uploadRequest, req.file.buffer);

      // CRITICAL: SDK inserts file_path but schema might require path
      // The auto-fixer in database.service.ts will populate path from file_path
      // For now, just return the fileInfo - the auto-fixer runs on database access

      res.status(200).json({ success: true, data: fileInfo });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to upload file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

