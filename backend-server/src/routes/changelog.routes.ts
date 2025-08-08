/**
 * Changelog Routes
 *
 * Handles changelog and activity tracking for projects
 * All routes are prefixed with /projects/:projectId/changelog
 */

import { Router } from "express";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";
import { DatabaseService } from "@/services/database.service";

const router: Router = Router();

// Apply authentication middleware to all changelog routes
router.use(authenticate);

/**
 * GET /projects/:projectId/changelog
 * Get changelog entries for a project
 */
router.get(
  "/:projectId/changelog",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50, entity_type, entity_id } = req.query;

      const db = DatabaseService.getInstance();

      const filters: any = {};
      if (entity_type) filters.entity_type = entity_type as string;
      if (entity_id) filters.entity_id = entity_id as string;

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        ...filters,
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: entries.length,
          totalPages: Math.ceil(entries.length / Number(limit)),
          hasNext: Number(page) < Math.ceil(entries.length / Number(limit)),
          hasPrev: Number(page) > 1,
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
 * GET /projects/:projectId/changelog/:resourceType/:resourceId
 * Get changelog entries for a specific resource
 */
router.get(
  "/:projectId/changelog/:resourceType/:resourceId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, resourceType, resourceId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const db = DatabaseService.getInstance();

      const entries = await db.getChangelogEntries({
        project_id: projectId,
        entity_type: resourceType,
        entity_id: resourceId,
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: entries.length,
          totalPages: Math.ceil(entries.length / Number(limit)),
          hasNext: Number(page) < Math.ceil(entries.length / Number(limit)),
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error) {
      console.error("Error getting resource changelog:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get resource changelog entries",
      });
    }
  }
);

export default router;
