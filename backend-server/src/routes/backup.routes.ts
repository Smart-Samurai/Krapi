/**
 * Backup Routes
 * 
 * Provides encrypted backup and restore functionality for KRAPI projects.
 * Base path: /krapi/k1/projects/:projectId/backup
 * 
 * Routes:
 * - POST /backup - Create encrypted project backup
 * - POST /restore - Restore project from backup
 * - GET /backups - List project backups
 * - DELETE /backups/:backupId - Delete a backup
 * - POST /backup/system - Create system backup
 * 
 * All routes require authentication and appropriate scopes.
 * 
 * @module routes/backup.routes
 */

import { BackendSDK } from "@krapi/sdk";
import { Request, Response, Router } from "express";


import { authenticate, requireScopes } from "../middleware/auth.middleware";
import { Scope } from "../types";

const router = Router({ mergeParams: true });

// Apply authentication middleware to all backup routes
router.use(authenticate);

// Initialize SDK function - called from app.ts
let backendSDK: BackendSDK;

/**
 * Initialize BackendSDK for backup routes
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeBackupSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

/**
 * Create encrypted project backup
 * 
 * POST /krapi/k1/projects/:projectId/backup
 * 
 * Creates an encrypted backup of the project database.
 * Requires authentication and projects:write scope.
 * 
 * @route POST /backup
 * @param {string} projectId - Project ID (from parent route)
 * @body {string} [description] - Backup description
 * @body {string} [password] - Encryption password (if not provided, one is generated)
 * @returns {Object} Backup result with backup_id, password, created_at, size, description
 */
router.post(
  "/backup",
  requireScopes({ scopes: [Scope.PROJECTS_WRITE], projectSpecific: true }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { description, password } = req.body;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }

      const backupOptions: {
        projectId: string;
        description?: string;
        password?: string;
      } = {
        projectId,
      };
      if (description !== undefined) {
        backupOptions.description = description;
      }
      if (password !== undefined) {
        backupOptions.password = password;
      }

      const backup = await backendSDK.backup.backupProject(backupOptions);

      return res.json({
        success: true,
        backup_id: backup.id,
        password: password || "",
        created_at: backup.created_at,
        size: backup.size,
        description: backup.description,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create project backup",
      });
    }
  }
);

/**
 * Restore project from encrypted backup
 * 
 * POST /krapi/k1/projects/:projectId/restore
 * 
 * Restores a project from an encrypted backup.
 * Requires authentication and projects:write scope.
 * 
 * @route POST /restore
 * @param {string} projectId - Project ID (from parent route)
 * @body {string} backup_id - Backup ID to restore
 * @body {string} password - Backup encryption password
 * @body {boolean} [overwrite] - Whether to overwrite existing data
 * @returns {Object} Restore result with success status
 */
router.post(
  "/restore",
  requireScopes({ scopes: [Scope.PROJECTS_WRITE], projectSpecific: true }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { backup_id, password, overwrite } = req.body;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      if (!backup_id || !password) {
        return res.status(400).json({
          success: false,
          error: "backup_id and password are required",
        });
      }

      await backendSDK.backup.restoreProject(backup_id, {
        password,
        overwrite,
      });

      return res.json({
        success: true,
        message: `Project ${projectId} restored successfully`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to restore project",
      });
    }
  }
);

/**
 * List backups for a project
 * GET /krapi/k1/projects/:projectId/backups
 * Query: { type?: "project" | "system" }
 * Returns: { backups: BackupMetadata[] }
 */
router.get(
  "/backups",
  requireScopes({ scopes: [Scope.PROJECTS_READ], projectSpecific: true }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { type } = req.query;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      const backups = await backendSDK.backup.listBackups(
        projectId,
        type as "project" | "system" | undefined
      );

      return res.json({
        success: true,
        backups: backups.map((backup) => ({
          id: backup.id,
          project_id: backup.project_id,
          type: backup.type,
          created_at: backup.created_at,
          size: backup.size,
          encrypted: backup.encrypted,
          version: backup.version,
          description: backup.description,
        })),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list backups",
      });
    }
  }
);

/**
 * Delete backup
 * DELETE /krapi/k1/backups/:backupId
 * Returns: { success: true }
 */
router.delete(
  "/backups/:backupId",
  requireScopes({ scopes: [Scope.PROJECTS_WRITE] }),
  async (req: Request, res: Response) => {
    try {
      const { backupId } = req.params;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      if (!backupId) {
        return res.status(400).json({
          success: false,
          error: "Backup ID is required",
        });
      }

      await backendSDK.backup.deleteBackup(backupId);

      return res.json({
        success: true,
        message: `Backup ${backupId} deleted successfully`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete backup",
      });
    }
  }
);

/**
 * Create system-wide backup (all projects + main database)
 * POST /krapi/k1/backup/system
 * Body: { description?: string, password?: string }
 * Returns: { backup_id, password, created_at }
 */
router.post(
  "/backup/system",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req: Request, res: Response) => {
    try {
      const { description, password } = req.body;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      const backup = await backendSDK.backup.backupSystem({
        description,
        password,
      });

      return res.json({
        success: true,
        backup_id: backup.id,
        password: password || "",
        created_at: backup.created_at,
        size: backup.size,
        description: backup.description,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create system backup",
      });
    }
  }
);

/**
 * List all backups (system-wide or project-specific)
 * GET /krapi/k1/backups
 * Query: { project_id?: string, type?: "project" | "system" }
 * Returns: { backups: BackupMetadata[] }
 */
router.get(
  "/backups",
  requireScopes({ scopes: [Scope.PROJECTS_READ] }),
  async (req: Request, res: Response) => {
    try {
      const { project_id, type } = req.query;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      const backups = await backendSDK.backup.listBackups(
        project_id ? (project_id as string) : undefined,
        type as "project" | "system" | undefined
      );

      return res.json({
        success: true,
        backups: backups.map((backup) => ({
          id: backup.id,
          project_id: backup.project_id,
          type: backup.type,
          created_at: backup.created_at,
          size: backup.size,
          encrypted: backup.encrypted,
          version: backup.version,
          description: backup.description,
        })),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list backups",
      });
    }
  }
);

export default router;
