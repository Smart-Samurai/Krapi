import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for downloading a file
 * GET /storage/download/:fileId
 */
export class DownloadFileHandler {
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
        download: (projectId: string, fileId: string) => Promise<Blob | Buffer>;
      };

      const fileData = await storageService.download(projectId, fileId);

      // Convert Blob/Buffer to response
      if (fileData instanceof Blob) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        res.setHeader("Content-Type", fileData.type || "application/octet-stream");
        res.setHeader("Content-Length", buffer.length);
        res.send(buffer);
      } else if (Buffer.isBuffer(fileData)) {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", fileData.length);
        res.send(fileData);
      } else {
        res.status(500).json({ success: false, error: "Invalid file data format" });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to download file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

