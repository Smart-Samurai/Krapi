import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "@/services/database.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  FileRecord,
  ChangeAction,
} from "@/types";

export class StorageController {
  private db: DatabaseService;
  private uploadPath: string;
  private maxFileSize: number;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.uploadPath = process.env.UPLOAD_PATH || "./data/uploads";
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "52428800"); // 50MB default

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // Configure multer for file uploads
  private getMulterConfig(projectId: string) {
    const projectPath = path.join(this.uploadPath, projectId);

    // Ensure project directory exists
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, projectPath);
      },
      filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
      },
    });

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        // For now, accept all file types
        // TODO: Implement project-specific file type restrictions
        cb(null, true);
      },
    });
  }

  // Upload file
  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId } = req.params;

      // Verify project exists
      const project = this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Configure multer
      const upload = this.getMulterConfig(projectId).single("file");

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

        // Create file record
        const fileRecord = await this.db.createFile({
          project_id: projectId,
          filename: req.file.filename,
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          uploaded_by: authReq.user?.id || authReq.session?.user_id || "system",
          created_at: new Date().toISOString(),
        });

        // Log the action
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: "file",
          entity_id: fileRecord.id,
          action: ChangeAction.CREATED,
          changes: { filename: req.file.originalname, size: req.file.size },
          performed_by:
            authReq.user?.id || authReq.session?.user_id || "system",
          session_id: authReq.session?.id,
        });

        res.status(201).json({
          success: true,
          data: {
            id: fileRecord.id,
            filename: fileRecord.original_name,
            size: fileRecord.size,
            mime_type: fileRecord.mime_type,
            uploaded_at: fileRecord.created_at,
          },
        } as ApiResponse);
        return;
      });
    } catch (error) {
      console.error("Upload file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload file",
      } as ApiResponse);
      return;
    }
  };

  // Get all files for a project
  getFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Verify project exists
      const project = this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      const files = await this.db.getProjectFiles(projectId);

      // Map to response format
      const fileData = files.map((file) => ({
        id: file.id,
        filename: file.original_name,
        size: file.size,
        mime_type: file.mime_type,
        uploaded_at: file.created_at,
        uploaded_by: file.uploaded_by,
      }));

      res.status(200).json({
        success: true,
        data: fileData,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch files",
      } as ApiResponse);
      return;
    }
  };

  // Get file info
  getFileInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;

      const file = await this.db.getFile(fileId);

      if (!file || file.project_id !== projectId) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: file,
      } as ApiResponse<FileRecord>);
      return;
    } catch (error) {
      console.error("Get file info error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch file information",
      } as ApiResponse);
      return;
    }
  };

  // Alias for getFileInfo
  getFile = this.getFileInfo;

  // Download file
  downloadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;

      const file = await this.db.getFile(fileId);

      if (!file || file.project_id !== projectId) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Check if file exists on disk
      if (!fs.existsSync(file.path)) {
        res.status(404).json({
          success: false,
          error: "File not found on disk",
        } as ApiResponse);
        return;
      }

      // Set headers
      res.setHeader("Content-Type", file.mime_type);
      res.setHeader("Content-Length", file.size.toString());
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.original_name}"`
      );

      // Stream file
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download file",
      } as ApiResponse);
      return;
    }
  };

  // Delete file
  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, fileId } = req.params;

      const file = await this.db.getFile(fileId);

      if (!file || file.project_id !== projectId) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Delete file from disk
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Delete file record
      const deleted = this.db.deleteFile(fileId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete file record",
        } as ApiResponse);
        return;
      }

      // Log action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "file",
        entity_id: fileId,
        action: ChangeAction.DELETED,
        changes: { filename: file.original_name },
        performed_by: authReq.user?.id || authReq.session?.user_id || "system",
        session_id: authReq.session?.id,
      });

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete file",
      } as ApiResponse);
      return;
    }
  };

  // Get storage stats for a project
  getStorageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Get storage stats directly from database
      const stats = await this.db.getProjectStorageStats(projectId);

      res.status(200).json({
        success: true,
        data: stats,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Get storage stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch storage stats",
      } as ApiResponse);
      return;
    }
  };
}
