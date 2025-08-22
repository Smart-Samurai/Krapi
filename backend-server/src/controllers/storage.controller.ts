import fs from "fs";
import path from "path";

import { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import { DatabaseService } from "@/services/database.service";
import { AuthenticatedRequest, ApiResponse, FileRecord } from "@/types";

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
        // Basic file type restrictions - can be enhanced with project-specific rules
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
          url: `/files/${req.file.filename}`, // Generate a URL for the file
          uploaded_by: authReq.user?.id || authReq.session?.user_id || "system",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Log the action
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: "file",
          entity_id: fileRecord.id,
          action: "created",
          changes: { filename: req.file.originalname, size: req.file.size },
          performed_by:
            authReq.user?.id || authReq.session?.user_id || "system",
          session_id: authReq.session?.id,
          user_id: authReq.user?.id || authReq.session?.user_id || "system",
          resource_type: "file",
          resource_id: fileRecord.id,
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
        action: "deleted",
        changes: { filename: file.original_name },
        performed_by: authReq.user?.id || authReq.session?.user_id || "system",
        session_id: authReq.session?.id,
        user_id: authReq.user?.id || authReq.session?.user_id || "system",
        resource_type: "file",
        resource_id: fileId,
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

  /**
   * Get storage statistics for a project
   */
  getStorageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const stats = await this.db.getStorageStatistics(projectId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting storage stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get storage statistics",
      });
    }
  };

  /**
   * Create a new folder
   */
  createFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, parent_folder_id, metadata } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Folder name is required",
        });
        return;
      }

      const folder = await this.db.createFolder({
        project_id: projectId,
        name,
        parent_folder_id,
        metadata,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: folder,
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create folder",
      });
    }
  };

  /**
   * Get folders for a project
   */
  getFolders = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { parent_folder_id, include_files } = req.query;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const folders = await this.db.getFolders(projectId, {
        parent_folder_id: parent_folder_id as string,
        include_files: include_files === "true",
      });

      res.json({
        success: true,
        data: folders,
      });
    } catch (error) {
      console.error("Error getting folders:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get folders",
      });
    }
  };

  /**
   * Delete a folder
   */
  deleteFolder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, folderId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      await this.db.deleteFolder(projectId, folderId);

      res.json({
        success: true,
        message: "Folder deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete folder",
      });
    }
  };

  /**
   * Get file URL for download
   */
  getFileUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { expires_in = 3600 } = req.query;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const file = await this.db.getFileById(projectId, fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: "File not found",
        });
        return;
      }

      const url = await this.db.generateFileUrl(file, Number(expires_in));

      res.json({
        success: true,
        data: {
          url,
          expires_at: new Date(Date.now() + Number(expires_in) * 1000),
        },
      });
    } catch (error) {
      console.error("Error generating file URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate file URL",
      });
    }
  };

  /**
   * Bulk delete files
   */
  bulkDeleteFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { file_ids } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!Array.isArray(file_ids) || file_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "File IDs array is required",
        });
        return;
      }

      const result = await this.db.bulkDeleteFiles(projectId, file_ids);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error bulk deleting files:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk delete files",
      });
    }
  };

  /**
   * Bulk move files
   */
  bulkMoveFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { file_ids, destination_folder_id } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!Array.isArray(file_ids) || file_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "File IDs array is required",
        });
        return;
      }

      const result = await this.db.bulkMoveFiles(
        projectId,
        file_ids,
        destination_folder_id
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error bulk moving files:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk move files",
      });
    }
  };

  /**
   * Bulk update file metadata
   */
  bulkUpdateMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { file_ids, metadata } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!Array.isArray(file_ids) || file_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: "File IDs array is required",
        });
        return;
      }

      const result = await this.db.bulkUpdateFileMetadata(
        projectId,
        file_ids,
        metadata
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error bulk updating metadata:", error);
      res.status(500).json({
        success: false,
        error: "Failed to bulk update metadata",
      });
    }
  };

  /**
   * Copy a file
   */
  copyFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { destination_folder_id, new_name } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.copyFile(projectId, fileId, {
        destination_folder_id,
        new_name,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error copying file:", error);
      res.status(500).json({
        success: false,
        error: "Failed to copy file",
      });
    }
  };

  /**
   * Move a file
   */
  moveFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { destination_folder_id, new_name } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.moveFile(projectId, fileId, {
        destination_folder_id,
        new_name,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error moving file:", error);
      res.status(500).json({
        success: false,
        error: "Failed to move file",
      });
    }
  };

  /**
   * Rename a file
   */
  renameFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { new_name } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!new_name) {
        res.status(400).json({
          success: false,
          error: "New name is required",
        });
        return;
      }

      const result = await this.db.renameFile(projectId, fileId, new_name);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error renaming file:", error);
      res.status(500).json({
        success: false,
        error: "Failed to rename file",
      });
    }
  };

  /**
   * Update file metadata
   */
  updateFileMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { metadata } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.updateFileMetadata(
        projectId,
        fileId,
        metadata
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error updating file metadata:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update file metadata",
      });
    }
  };

  /**
   * Add tags to a file
   */
  addFileTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { tags } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({
          success: false,
          error: "Tags array is required",
        });
        return;
      }

      const result = await this.db.addFileTags(projectId, fileId, tags);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error adding file tags:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add file tags",
      });
    }
  };

  /**
   * Remove tags from a file
   */
  removeFileTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { tags } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({
          success: false,
          error: "Tags array is required",
        });
        return;
      }

      const result = await this.db.removeFileTags(projectId, fileId, tags);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error removing file tags:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove file tags",
      });
    }
  };

  /**
   * Get file permissions
   */
  getFilePermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const permissions = await this.db.getFilePermissions(projectId, fileId);

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      console.error("Error getting file permissions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get file permissions",
      });
    }
  };

  /**
   * Grant file permission
   */
  grantFilePermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const { user_id, permission } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.grantFilePermission(
        projectId,
        fileId,
        user_id,
        permission
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error granting file permission:", error);
      res.status(500).json({
        success: false,
        error: "Failed to grant file permission",
      });
    }
  };

  /**
   * Revoke file permission
   */
  revokeFilePermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId, userId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      await this.db.revokeFilePermission(projectId, fileId, userId);

      res.json({
        success: true,
        message: "Permission revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking file permission:", error);
      res.status(500).json({
        success: false,
        error: "Failed to revoke file permission",
      });
    }
  };

  /**
   * Get file versions
   */
  getFileVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const versions = await this.db.getFileVersions(projectId, fileId);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      console.error("Error getting file versions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get file versions",
      });
    }
  };

  /**
   * Upload file version
   */
  uploadFileVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
        return;
      }

      const version = await this.db.uploadFileVersion(
        projectId,
        fileId,
        req.file,
        currentUser.id
      );

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      console.error("Error uploading file version:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload file version",
      });
    }
  };

  /**
   * Restore file version
   */
  restoreFileVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId, versionId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.restoreFileVersion(
        projectId,
        fileId,
        versionId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error restoring file version:", error);
      res.status(500).json({
        success: false,
        error: "Failed to restore file version",
      });
    }
  };

  /**
   * Make file public
   */
  makeFilePublic = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.makeFilePublic(projectId, fileId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error making file public:", error);
      res.status(500).json({
        success: false,
        error: "Failed to make file public",
      });
    }
  };

  /**
   * Make file private
   */
  makeFilePrivate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, fileId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const result = await this.db.makeFilePrivate(projectId, fileId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error making file private:", error);
      res.status(500).json({
        success: false,
        error: "Failed to make file private",
      });
    }
  };
}
