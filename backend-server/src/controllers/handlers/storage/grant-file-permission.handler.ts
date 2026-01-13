import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "@/services/multi-database-manager.service";
import { ApiResponse } from "@/types";

/**
 * Handler for granting file permission
 * POST /krapi/k1/projects/:projectId/files/:fileId/permissions
 * 
 * Uses SDK's database connection to insert/update file_permissions table directly.
 * Note: File permissions are stored in project databases, not main database.
 */
export class GrantFilePermissionHandler {
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
      const { userId, permission } = req.body;

      if (!projectId || !fileId || !userId || !permission) {
        res.status(400).json({
          success: false,
          error: "Project ID, file ID, user ID, and permission are required",
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

      // Check if permission already exists
      const existing = await this.dbManager.queryProject(
        projectId,
        "SELECT id FROM file_permissions WHERE project_id = ? AND file_id = ? AND user_id = ?",
        [projectId, fileId, userId]
      );

      const permissionId = uuidv4();
      const grantedAt = new Date().toISOString();

      if (existing.rows.length > 0) {
        // Update existing permission
        await this.dbManager.queryProject(
          projectId,
          `UPDATE file_permissions 
           SET permission = ?, granted_by = ?, granted_at = ?
           WHERE project_id = ? AND file_id = ? AND user_id = ?`,
          [permission, "system", grantedAt, projectId, fileId, userId]
        );
      } else {
        // Insert new permission
        await this.dbManager.queryProject(
          projectId,
          `INSERT INTO file_permissions (id, project_id, file_id, user_id, permission, granted_by, granted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [permissionId, projectId, fileId, userId, permission, "system", grantedAt]
        );
      }

      // Query back the permission
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM file_permissions WHERE project_id = ? AND file_id = ? AND user_id = ?",
        [projectId, fileId, userId]
      );

      res.json({
        success: true,
        data: result.rows[0] || {},
        message: "Permission granted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error granting file permission:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to grant file permission",
      } as ApiResponse);
    }
  }
}

