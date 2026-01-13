import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { StorageService } from "@/services/storage.service";
import { AuthenticatedRequest } from "@/types";

/**
 * Handler for uploading a file
 * POST /storage/upload
 */
export class UploadFileHandler {
  constructor(_backendSDK: BackendSDK) {}

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

      const { folder } = req.body;
      const authReq = req as AuthenticatedRequest;

      const storageService = StorageService.getInstance();
      const uploadedBy = authReq.user?.id || "system";

      // Merge client-provided metadata if present
      let clientMetadata: Record<string, unknown> | undefined;
      if (req.body?.metadata) {
        if (typeof req.body.metadata === "string") {
          try {
            clientMetadata = JSON.parse(req.body.metadata) as Record<string, unknown>;
          } catch {
            clientMetadata = undefined;
          }
        } else if (typeof req.body.metadata === "object") {
          clientMetadata = req.body.metadata as Record<string, unknown>;
        }
      }

      const metadata: Record<string, unknown> = {
        projectId,
        uploadedBy,
        folderId: folder || undefined,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        ...(clientMetadata || {}),
      };

      const fileInfo = await storageService.uploadFile(req.file.buffer, {
        ...metadata,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
      });

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

