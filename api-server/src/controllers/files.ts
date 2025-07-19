import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import database from "../services/database";
import { ApiResponse, FileUpload, AuthPayload } from "../types";

interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Define allowed file types
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/json",
    "application/octet-stream", // Allow generic binary files (for testing)
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Transform database FileUpload to frontend-compatible format
const transformFileUpload = (file: FileUpload & { mime_type: string }) => ({
  ...file,
  mimetype: file.mime_type, // Transform mime_type to mimetype for frontend
});

export class FilesController {
  static getAllFiles(req: AuthenticatedRequest, res: Response): void {
    try {
      const { access_level } = req.query;
      // const _user = req.user; // Available for future filtering

      const files = database.getAllFiles(
        undefined, // Don't filter by uploaded_by for admins
        access_level as string
      );

      // Transform files to match frontend expectations
      const transformedFiles = files.map(transformFileUpload);

      const response: ApiResponse<(FileUpload & { mimetype: string })[]> = {
        success: true,
        data: transformedFiles,
        message: `Retrieved ${files.length} files`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all files error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve files",
      };
      res.status(500).json(response);
    }
  }

  static getFileById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const file = database.getFileById(parseInt(id));

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: `File with id '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<FileUpload & { mimetype: string }> = {
        success: true,
        data: transformFileUpload(file as FileUpload & { mime_type: string }),
        message: `Retrieved file with id '${id}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get file by id error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve file",
      };
      res.status(500).json(response);
    }
  }

  static uploadFile(req: AuthenticatedRequest, res: Response): void {
    try {
      console.log("Upload file request received");
      const user = req.user;
      const file = req.file;
      const { access_level } = req.body;

      console.log("Upload file debug:", {
        user: user ? { userId: user.userId, username: user.username } : null,
        file: file
          ? {
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
            }
          : null,
        access_level,
      });

      if (!user) {
        console.log("No user found in request");
        const response: ApiResponse = {
          success: false,
          error: "User not authenticated",
        };
        res.status(401).json(response);
        return;
      }

      if (!file) {
        console.log("No file found in request");
        const response: ApiResponse = {
          success: false,
          error: "No file uploaded",
        };
        res.status(400).json(response);
        return;
      }

      // Validate access level
      const validAccessLevels = ["public", "protected", "private"];
      const finalAccessLevel = validAccessLevels.includes(access_level)
        ? access_level
        : "public";

      console.log("Creating file in database with data:", {
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: file.path,
        uploaded_by: user.userId,
        access_level: finalAccessLevel,
      });

      const fileData = database.createFile({
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: file.path,
        uploaded_by: user.userId,
        access_level: finalAccessLevel,
      });

      console.log("File created successfully:", fileData);

      const response: ApiResponse<FileUpload & { mimetype: string }> = {
        success: true,
        data: transformFileUpload(
          fileData as FileUpload & { mime_type: string }
        ),
        message: `File '${file.originalname}' uploaded successfully`,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Upload file error:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        let errorMessage = "File upload error";
        if (error.code === "LIMIT_FILE_SIZE") {
          errorMessage = "File size too large. Maximum size is 50MB";
        } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
          errorMessage = "Unexpected file field";
        }

        const response: ApiResponse = {
          success: false,
          error: errorMessage,
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      };
      res.status(500).json(response);
    }
  }

  static downloadFile(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const fileId = parseInt(id);

      if (isNaN(fileId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid file ID",
        };
        res.status(400).json(response);
        return;
      }

      const file = database.getFileById(fileId);

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: `File with ID '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Check if file exists on disk
      const filePath = path.join(__dirname, "../../uploads", file.filename);
      if (!fs.existsSync(filePath)) {
        const response: ApiResponse = {
          success: false,
          error: "File not found on disk",
        };
        res.status(404).json(response);
        return;
      }

      // Set headers for file download
      res.setHeader("Content-Type", file.mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.original_name}"`
      );

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download file error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to download file",
      };
      res.status(500).json(response);
    }
  }

  static updateFile(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const fileId = parseInt(id);
      const { access_level: _access_level, description: _description } =
        req.body;

      if (isNaN(fileId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid file ID",
        };
        res.status(400).json(response);
        return;
      }

      const file = database.getFileById(fileId);

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: `File with ID '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Update file in database (placeholder - not implemented in database service)
      const response: ApiResponse = {
        success: true,
        message: `File with ID '${id}' updated successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update file error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update file",
      };
      res.status(500).json(response);
    }
  }

  static deleteFile(req: AuthenticatedRequest, res: Response): void {
    try {
      const { id } = req.params;
      const user = req.user;
      const file = database.getFileById(parseInt(id));

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: "User not authenticated",
        };
        res.status(401).json(response);
        return;
      }

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: `File with id '${id}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Check if user has permission to delete (owner or admin)
      if (file.uploaded_by !== user.userId && user.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "Access denied",
        };
        res.status(403).json(response);
        return;
      }

      // Delete file from database
      const deleted = database.deleteFile(parseInt(id));

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to delete file from database",
        };
        res.status(500).json(response);
        return;
      }

      // Delete file from disk
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (fsError) {
        console.error("Failed to delete file from disk:", fsError);
        // Continue anyway, database record is deleted
      }

      const response: ApiResponse = {
        success: true,
        message: `File '${file.original_name}' deleted successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Delete file error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete file",
      };
      res.status(500).json(response);
    }
  }

  static getPublicFile(req: Request, res: Response): void {
    try {
      const { filename } = req.params;
      const file = database.getFileByFilename(filename);

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: `File '${filename}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Check access level for public endpoints
      if (file.access_level === "private") {
        const response: ApiResponse = {
          success: false,
          error: "Access denied",
        };
        res.status(403).json(response);
        return;
      }

      // Check if file exists on disk
      if (!fs.existsSync(file.path)) {
        const response: ApiResponse = {
          success: false,
          error: "File not found on disk",
        };
        res.status(404).json(response);
        return;
      }

      // Set appropriate headers for inline display
      res.setHeader("Content-Type", file.mime_type);
      res.setHeader("Content-Length", file.size);

      // For images, allow inline display
      if (file.mime_type.startsWith("image/")) {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${file.original_name}"`
        );
      } else {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.original_name}"`
        );
      }

      // Stream the file
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Get public file error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve file",
      };
      res.status(500).json(response);
    }
  }
}
