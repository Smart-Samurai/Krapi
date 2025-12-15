import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting file metadata
 * GET /storage/metadata/:fileId
 */
export class GetFileMetadataHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Type assertion needed as SDK types may not be fully updated
      const storageService = this.backendSDK.storage as unknown as {
        getMetadata: (projectId: string, fileId: string) => Promise<{
          id: string;
          filename: string;
          size: number;
          mimetype?: string;
        }>;
      };

      const metadata = await storageService.getMetadata(projectId, fileId);

      res.status(200).json({ success: true, data: metadata });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get file metadata",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

