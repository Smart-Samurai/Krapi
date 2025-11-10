/**
 * Storage Routes
 * 
 * Handles file storage-related endpoints for projects.
 * Base path: /krapi/k1/projects/:projectId/storage
 * 
 * Routes:
 * - POST /upload - Upload a file
 * - GET /download/:fileId - Download a file
 * - GET /list - List files
 * - DELETE /:fileId - Delete a file
 * - GET /stats - Get storage statistics
 * 
 * All routes require authentication and storage scopes.
 * 
 * @module routes/storage.routes
 */
import { Router } from "express";
import multer from "multer";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

// Use mergeParams: true to merge params from parent route
// This allows accessing :projectId from parent route /projects/:projectId/storage
const router: Router = Router({ mergeParams: true });

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Upload a file
 * 
 * POST /krapi/k1/projects/:projectId/storage/upload
 * 
 * Uploads a file to the project's storage directory.
 * Requires authentication and storage:write scope.
 * 
 * @route POST /upload
 * @param {string} projectId - Project ID (from parent route)
 * @body {File} file - File to upload (multipart/form-data)
 * @body {string} [project_id] - Project ID (alternative to route param)
 * @body {string} [folder] - Folder path for file organization
 * @returns {Object} Upload result with file_id, filename, size, mimetype
 */
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

      return res.status(200).json({
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
      return res.status(500).json({
        success: false,
        error: "Failed to upload file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  }
);

/**
 * Download a file
 * 
 * GET /krapi/k1/projects/:projectId/storage/download/:fileId
 * 
 * Downloads a file from the project's storage.
 * Requires authentication and storage:read scope.
 * 
 * @route GET /download/:fileId
 * @param {string} projectId - Project ID (from parent route)
 * @param {string} fileId - File ID
 * @returns {Buffer} File content as binary data
 */
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

      return res.send(buffer);
    } catch (error) {
      console.error("File download error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to download file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
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
      return res.status(200).json({
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
      return res.status(500).json({
        success: false,
        error: "Failed to get file metadata",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  }
);

// Get storage info endpoint (must come before /project/:projectId to avoid route conflicts)
// Route is mounted at /projects/:projectId/storage, so projectId is in params
router.get(
  "/info",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      // projectId comes from parent route /projects/:projectId/storage
      // When route is mounted as /projects/:projectId/storage, Express merges params
      // Check merged params first, then fallback to other sources
      const params = req.params as Record<string, string>;
      // Express merges params from parent route, so projectId should be in req.params
      const projectId = params.projectId;

      if (!projectId) {
        console.error(`❌ [STORAGE DEBUG] Project ID not found in request`);
        console.error(`   Params:`, JSON.stringify(params));
        console.error(`   All params keys:`, Object.keys(params));
        console.error(`   URL:`, req.url);
        console.error(`   Path:`, req.path);
        console.error(`   Base URL:`, req.baseUrl);
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }

      // Use BackendSDK if available, otherwise use StorageService
      const backendSDK = (req as { app?: { locals?: { backendSDK?: unknown } } }).app?.locals?.backendSDK;
      
      if (backendSDK && typeof backendSDK === "object" && "storage" in backendSDK) {
        const storageService = (backendSDK as { storage?: { getStorageInfo?: (projectId: string) => Promise<unknown> } }).storage;
        if (storageService?.getStorageInfo) {
          const info = await storageService.getStorageInfo(projectId);
          return res.status(200).json({
            success: true,
            data: info,
          });
        }
      }

      // Fallback: use DatabaseService
      const { DatabaseService } = await import("@/services/database.service");
      const db = DatabaseService.getInstance();
      
      // Get storage statistics
      const stats = await db.getStorageStatistics(projectId);
      
      // Get project info for quota - storage_limit is in settings, not in project table
      const project = await db.getProjectById(projectId);
      const settings = (project?.settings as { storage_limit?: number } | undefined) || {};
      const quota = settings.storage_limit || 1073741824; // 1GB default
      const storageUsed = stats.storageUsed || 0;
      
      return res.status(200).json({
        success: true,
        data: {
          total_files: stats.totalFiles || 0,
          total_size: stats.totalSize || 0,
          storage_used_percentage: quota > 0 ? (storageUsed / quota) * 100 : 0,
          quota,
        },
      });
    } catch (error) {
      console.error("Get storage info error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get storage info",
        details:
          process.env.NODE_ENV === "development"
            ? (error instanceof Error ? error.message : "Unknown error")
            : undefined,
      });
    }
  }
);

// Get storage stats endpoint (must come before /project/:projectId to avoid route conflicts)
router.get(
  "/stats",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      // projectId comes from parent route /projects/:projectId/storage
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }

      // Use BackendSDK if available, otherwise use StorageService
      const backendSDK = (req as { app?: { locals?: { backendSDK?: unknown } } }).app?.locals?.backendSDK;
      
      if (backendSDK && typeof backendSDK === "object" && "storage" in backendSDK) {
        const storageService = (backendSDK as { storage?: { getStorageStats?: (projectId: string) => Promise<unknown> } }).storage;
        if (storageService?.getStorageStats) {
          const stats = await storageService.getStorageStats(projectId);
          return res.status(200).json({
            success: true,
            data: stats,
          });
        }
      }

      // Fallback: use DatabaseService
      const { DatabaseService } = await import("@/services/database.service");
      const db = DatabaseService.getInstance();
      
      // Get storage statistics
      const stats = await db.getStorageStatistics(projectId);
      
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get storage stats error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get storage stats",
        details:
          process.env.NODE_ENV === "development"
            ? (error instanceof Error ? error.message : "Unknown error")
            : undefined,
      });
    }
  }
);

// List files in project endpoint
// Route is mounted at /projects/:projectId/storage, so /files becomes /projects/:projectId/storage/files
router.get(
  "/files",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      // projectId comes from parent route /projects/:projectId/storage
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }

      // For now, return mock file list
      // In a real implementation, this would retrieve actual files for the project
      return res.status(200).json({
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
      return res.status(500).json({
        success: false,
        error: "Failed to list files",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
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
      return res.status(200).json({
        success: true,
        message: "File deleted successfully",
        file_id: fileId,
      });
    } catch (error) {
      console.error("Delete file error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  }
);

export default router;
