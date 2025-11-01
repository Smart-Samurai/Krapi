import { Router } from "express";
import multer from "multer";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint - supports both global and project-specific access
router.post(
  "/upload",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: false, // Allow global access
  }),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
        });
      }

      const { project_id, folder } = req.body;

      // For now, just return a mock response
      // In a real implementation, this would save the file and store metadata
      const fileId = `file_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      res.status(200).json({
        success: true,
        file_id: fileId,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        project_id,
        folder,
        uploaded_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload file",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// File download endpoint - supports both global and project-specific access
router.get(
  "/download/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false, // Allow global access
  }),
  async (req, res) => {
    try {
      const { fileId: _fileId } = req.params;

      // For now, return a mock file
      // In a real implementation, this would retrieve the actual file
      const mockContent = "This is a mock file content for testing purposes";
      const buffer = Buffer.from(mockContent, "utf8");

      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mock-file.txt"`
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download file",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// File metadata endpoint - supports both global and project-specific access
router.get(
  "/metadata/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false, // Allow global access
  }),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      // For now, return mock metadata
      // In a real implementation, this would retrieve actual file metadata
      res.status(200).json({
        success: true,
        file_id: fileId,
        filename: "mock-file.txt",
        size: 45,
        mimetype: "text/plain",
        project_id: "mock-project-id",
        folder: "test-files",
        uploaded_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
      });
    } catch (error) {
      console.error("File metadata error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get file metadata",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// List files in project endpoint
router.get(
  "/project/:projectId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      // For now, return mock file list
      // In a real implementation, this would retrieve actual files for the project
      res.status(200).json({
        success: true,
        project_id: projectId,
        files: [
          {
            file_id: "mock_file_1",
            filename: "test-file-1.txt",
            size: 45,
            mimetype: "text/plain",
            folder: "test-files",
            uploaded_at: new Date().toISOString(),
          },
          {
            file_id: "mock_file_2",
            filename: "test-file-2.txt",
            size: 67,
            mimetype: "text/plain",
            folder: "test-files",
            uploaded_at: new Date().toISOString(),
          },
        ],
        total: 2,
      });
    } catch (error) {
      console.error("List files error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list files",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Delete file endpoint
router.delete(
  "/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: false, // Allow global access
  }),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      // For now, just return success
      // In a real implementation, this would actually delete the file
      res.status(200).json({
        success: true,
        message: "File deleted successfully",
        file_id: fileId,
      });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete file",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

export default router;
