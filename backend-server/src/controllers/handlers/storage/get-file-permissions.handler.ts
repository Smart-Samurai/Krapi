import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { MultiDatabaseManager } from "@/services/multi-database-manager.service";
import { ApiResponse } from "@/types";

/**
 * Handler for getting file permissions
 * GET /krapi/k1/projects/:projectId/files/:fileId/permissions
 * 
 * Uses SDK's database connection to query file_permissions table directly.
 * Note: File permissions are stored in project databases, not main database.
 */
export class GetFilePermissionsHandler {
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

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
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

      // Use SDK's database connection to query file_permissions
      // File permissions are in project database
      const sql = `
        SELECT fp.*, u.user_id as username, u.email 
        FROM file_permissions fp 
        LEFT JOIN project_users u ON fp.user_id = u.id 
        WHERE fp.file_id = ? AND fp.project_id = ?
      `;
      
      const result = await this.dbManager.queryProject(projectId, sql, [fileId, projectId]);

      res.json({
        success: true,
        data: result.rows,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting file permissions:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get file permissions",
      } as ApiResponse);
    }
  }
}

