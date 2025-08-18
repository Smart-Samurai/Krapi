/**
 * Changelog Routes
 *
 * Handles changelog and activity tracking for projects
 * All routes are prefixed with /changelog
 */

import { Router } from "express";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { DatabaseService } from "@/services/database.service";
import { Scope } from "@/types";

const router: Router = Router();

// Apply authentication middleware to all changelog routes
router.use(authenticate);

/**
 * GET /changelog/projects/:projectId
 * Get changelog entries for a project
 */
router.get(
  "/projects/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 50, offset = 0, action_type, user_id, start_date, end_date, collection_name, document_id } = req.query;

      const db = DatabaseService.getInstance();

      const filters: Record<string, string> = {};
      if (action_type) filters.action_type = action_type as string;
      if (user_id) filters.user_id = user_id as string;
      if (start_date) filters.start_date = start_date as string;
      if (end_date) filters.end_date = end_date as string;
      if (collection_name) filters.collection_name = collection_name as string;
      if (document_id) filters.document_id = document_id as string;

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        ...filters,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: entries.length,
          has_more: entries.length === Number(limit),
        },
      });
    } catch (error) {
      console.error("Error getting changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get changelog entries",
      });
    }
  }
);

/**
 * GET /changelog/projects/:projectId/collections/:collectionName
 * Get changelog entries for a specific collection
 */
router.get(
  "/projects/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, collectionName } = req.params;
      const { limit = 50, offset = 0, action_type, user_id, start_date, end_date, document_id } = req.query;

      const db = DatabaseService.getInstance();

      const filters: Record<string, string> = {};
      if (action_type) filters.action_type = action_type as string;
      if (user_id) filters.user_id = user_id as string;
      if (start_date) filters.start_date = start_date as string;
      if (end_date) filters.end_date = end_date as string;
      if (document_id) filters.document_id = document_id as string;

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        collection_name: collectionName,
        ...filters,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: entries.length,
          has_more: entries.length === Number(limit),
        },
      });
    } catch (error) {
      console.error("Error getting collection changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get collection changelog entries",
      });
    }
  }
);

/**
 * GET /changelog/projects/:projectId/collections/:collectionName/documents/:documentId
 * Get changelog entries for a specific document
 */
router.get(
  "/projects/:projectId/collections/:collectionName/documents/:documentId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, collectionName, documentId } = req.params;
      const { limit = 50, offset = 0, action_type, user_id, start_date, end_date } = req.query;

      const db = DatabaseService.getInstance();

      const filters: Record<string, string> = {};
      if (action_type) filters.action_type = action_type as string;
      if (user_id) filters.user_id = user_id as string;
      if (start_date) filters.start_date = start_date as string;
      if (end_date) filters.end_date = end_date as string;

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        collection_name: collectionName,
        document_id: documentId,
        ...filters,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: entries.length,
          has_more: entries.length === Number(limit),
        },
      });
    } catch (error) {
      console.error("Error getting document changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get document changelog entries",
      });
    }
  }
);

/**
 * GET /changelog/projects/:projectId/users/:userId/activity
 * Get user activity for a specific project
 */
router.get(
  "/projects/:projectId/users/:userId/activity",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      const { limit = 50, offset = 0, action_type, start_date, end_date, entity_type } = req.query;

      const db = DatabaseService.getInstance();

      const filters: Record<string, string> = {};
      if (action_type) filters.action_type = action_type as string;
      if (start_date) filters.start_date = start_date as string;
      if (end_date) filters.end_date = end_date as string;
      if (entity_type) filters.entity_type = entity_type as string;

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        user_id: userId,
        ...filters,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: entries.length,
          has_more: entries.length === Number(limit),
        },
      });
    } catch (error) {
      console.error("Error getting user activity:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user activity",
      });
    }
  }
);

/**
 * GET /changelog/statistics/:projectId
 * Get changelog statistics for a project
 */
router.get(
  "/statistics/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { period = "day", start_date, end_date, group_by } = req.query;

      const db = DatabaseService.getInstance();

      // This would need to be implemented in the database service
      const stats = await db.getChangelogStatistics(projectId, {
        period: period as string,
        start_date: start_date as string,
        end_date: end_date as string,
        group_by: group_by as string,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting changelog statistics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get changelog statistics",
      });
    }
  }
);

/**
 * POST /changelog/export/:projectId
 * Export changelog data
 */
router.post(
  "/export/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { format = "json", start_date, end_date, action_type, user_id, entity_type } = req.body;

      const db = DatabaseService.getInstance();

      // This would need to be implemented in the database service
      const exportResult = await db.exportChangelog(projectId, {
        format,
        start_date,
        end_date,
        action_type,
        user_id,
        entity_type,
      });

      res.json({
        success: true,
        data: exportResult,
      });
    } catch (error) {
      console.error("Error exporting changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to export changelog",
      });
    }
  }
);

/**
 * DELETE /changelog/purge
 * Purge old changelog entries (admin only)
 */
router.delete(
  "/purge",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      const { older_than_days, project_id, action_type, entity_type } = req.body;

      const db = DatabaseService.getInstance();

      // This would need to be implemented in the database service
      const purgeResult = await db.purgeOldChangelog({
        older_than_days: Number(older_than_days),
        project_id,
        action_type,
        entity_type,
      });

      res.json({
        success: true,
        data: purgeResult,
      });
    } catch (error) {
      console.error("Error purging changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to purge changelog",
      });
    }
  }
);

export default router;
