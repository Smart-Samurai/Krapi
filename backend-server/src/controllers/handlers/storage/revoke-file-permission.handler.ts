import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { MultiDatabaseManager } from "@/services/multi-database-manager.service";
import { ApiResponse } from "@/types";

/**
 * Handler for revoking file permission
 * DELETE /krapi/k1/projects/:projectId/files/:fileId/permissions
 * 
 * Uses SDK's database connection to delete from file_permissions table directly.
 * Note: File permissions are stored in project databases, not main database.
 */
export class RevokeFilePermissionHandler {
  private dbManager: MultiDatabaseManager;

  constructor(private backendSDK: BackendSDK) {
    // Initialize database manager for project-specific queries
    const mainDbPath = process.env.DB_PATH || process.env.SQLITE_DB_PATH;
    const projectsDbDir = process.env.PROJECTS_DB_DIR;
    this.dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, fileId } = req.params;
      const { userId } = req.body;

      if (!projectId || !fileId || !userId) {
        res.status(400).json({
          success: false,
          error: "Project ID, file ID, and user ID are required",
        } as ApiResponse);
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Use SDK's database connection to delete file permission
      // File permissions are in project database
      const result = await this.dbManager.queryProject(
        projectId,
        "DELETE FROM file_permissions WHERE project_id = ? AND file_id = ? AND user_id = ?",
        [projectId, fileId, userId]
      );

      res.json({
        success: true,
        data: {
          deleted: result.rowCount > 0,
        },
        message: "Permission revoked successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error revoking file permission:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to revoke file permission",
      } as ApiResponse);
    }
  }
}

