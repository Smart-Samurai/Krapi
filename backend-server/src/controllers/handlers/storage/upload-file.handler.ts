import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";
import multer from "multer";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for uploading a file
 * POST /krapi/k1/projects/:projectId/storage/upload
 */
export class UploadFileHandler {
  private backendSDK: BackendSDK;
  private maxFileSize: number;

  constructor(
    backendSDK: BackendSDK,
    maxFileSize: number
  ) {
    this.backendSDK = backendSDK;
    this.maxFileSize = maxFileSize;
  }

  private getMulterConfig() {
    // Use memory storage since SDK handles file storage
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "application/json",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
    });
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
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

      // Configure multer
      const upload = this.getMulterConfig().single("file");

      // Handle file upload
      upload(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
              res.status(400).json({
                success: false,
                error: "File size exceeds limit",
              } as ApiResponse);
              return;
            }
          }
          res.status(400).json({
            success: false,
            error: err.message || "File upload failed",
          } as ApiResponse);
          return;
        }

        if (!req.file) {
          res.status(400).json({
            success: false,
            error: "No file provided",
          } as ApiResponse);
          return;
        }

        // Upload file using SDK storage.uploadFile() method
        const uploadedBy = authReq.user?.id || authReq.session?.user_id || "system";
        const fileBuffer = Buffer.from(req.file.buffer);
        
        const fileRecord = await this.backendSDK.storage.uploadFile(
          projectId,
          {
            original_name: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by: uploadedBy,
            folder_id: req.body.folder_id,
            tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : undefined,
            metadata: req.body.metadata ? (typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata) : undefined,
            is_public: req.body.is_public === true || req.body.is_public === 'true',
          },
          fileBuffer
        );

        // Log the action using SDK changelog
        await this.backendSDK.changelog.create({
          entity_type: "file",
          entity_id: fileRecord.id,
          action: "created",
          changes: { filename: req.file.originalname, size: req.file.size },
          ...(authReq.session?.id && { session_id: authReq.session.id }),
          user_id: authReq.user?.id || authReq.session?.user_id || "system",
        });

        res.status(201).json({
          success: true,
          data: {
            id: fileRecord.id,
            filename: fileRecord.original_name,
            size: (fileRecord as { size?: number; file_size?: number }).size || (fileRecord as { file_size?: number }).file_size || 0,
            mime_type: fileRecord.mime_type,
            uploaded_at: fileRecord.created_at,
          },
        } as ApiResponse);
      });
    } catch (error) {
      console.error("Upload file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload file",
      } as ApiResponse);
    }
  }
}


