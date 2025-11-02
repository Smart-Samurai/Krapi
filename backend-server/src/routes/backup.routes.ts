/**
 * Backup Routes
 * 
 * Provides encrypted backup and restore functionality for KRAPI projects.
 * All routes require authentication and appropriate scopes.
 */

import { BackendSDK } from "@krapi/sdk";
import { Request, Response, Router } from "express";


import { requireScopes } from "../middleware/auth.middleware";
import { Scope } from "../types";

const router = Router({ mergeParams: true });

// Initialize SDK function - called from app.ts
let backendSDK: BackendSDK;
export const initializeBackupSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

/**
 * Create encrypted project backup
 * POST /krapi/k1/projects/:projectId/backup
 * Body: { description?: string, password?: string }
 * Returns: { backup_id, password, created_at }
 */
router.post(
  "/:projectId/backup",
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

      const backup = await backendSDK.backup.backupProject({
        projectId,
        description,
        password,
      });

      res.json({
        success: true,
        backup_id: backup.id,
        password: password || "",
        created_at: backup.created_at,
        size: backup.size,
        description: backup.description,
      });
    } catch (error) {
      res.status(500).json({
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
 * POST /krapi/k1/projects/:projectId/restore
 * Body: { backup_id: string, password: string, overwrite?: boolean }
 * Returns: { success: true }
 */
router.post(
  "/:projectId/restore",
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

      res.json({
        success: true,
        message: `Project ${projectId} restored successfully`,
      });
    } catch (error) {
      res.status(500).json({
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
  "/:projectId/backups",
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

      res.json({
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
      res.status(500).json({
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

      await backendSDK.backup.deleteBackup(backupId);

      res.json({
        success: true,
        message: `Backup ${backupId} deleted successfully`,
      });
    } catch (error) {
      res.status(500).json({
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

      res.json({
        success: true,
        backup_id: backup.id,
        password: password || "",
        created_at: backup.created_at,
        size: backup.size,
        description: backup.description,
      });
    } catch (error) {
      res.status(500).json({
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
        project_id as string | undefined,
        type as "project" | "system" | undefined
      );

      res.json({
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
      res.status(500).json({
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
