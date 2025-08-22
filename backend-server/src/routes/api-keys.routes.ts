/**
 * API Keys Routes
 *
 * Handles API key management for projects
 * All routes are prefixed with /projects/:projectId/api-keys
 */

import { ApiKeyScope } from "@krapi/sdk";
import { Router, Request, Response } from "express";

import { authenticateProject } from "@/middleware/auth.middleware";
import { validateProjectAccess } from "@/middleware/validation.middleware";
import { DatabaseService } from "@/services/database.service";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: string;
    projectId?: string;
  };
}

const router: Router = Router();

// Apply authentication middleware to all API key routes
router.use(authenticateProject);
router.use(validateProjectAccess);

/**
 * GET /projects/:projectId/api-keys
 * Get all API keys for a project
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const db = DatabaseService.getInstance();

    const apiKeys = await db.getProjectApiKeys(projectId);

    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get API keys",
    });
  }
});

/**
 * POST /projects/:projectId/api-keys
 * Create a new API key for a project
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const { name, scopes } = req.body;
    const db = DatabaseService.getInstance();

    const apiKey = await db.createProjectApiKey({
      project_id: projectId,
      name,
      scopes: scopes as ApiKeyScope[],
      user_id: req.user?.id || "system",
    });

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create API key",
    });
  }
});

/**
 * GET /projects/:projectId/api-keys/:keyId
 * Get a specific API key
 */
router.get("/:keyId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, keyId } = req.params as {
      projectId: string;
      keyId: string;
    };
    const db = DatabaseService.getInstance();

    const apiKey = await db.getProjectApiKey(projectId, keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get API key",
    });
  }
});

/**
 * PUT /projects/:projectId/api-keys/:keyId
 * Update an API key
 */
router.put("/:keyId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, keyId } = req.params as {
      projectId: string;
      keyId: string;
    };
    const updates = req.body;
    const db = DatabaseService.getInstance();

    const apiKey = await db.updateProjectApiKey(projectId, keyId, updates);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update API key",
    });
  }
});

/**
 * DELETE /projects/:projectId/api-keys/:keyId
 * Delete an API key
 */
router.delete("/:keyId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { keyId } = req.params as { projectId: string; keyId: string };
    const db = DatabaseService.getInstance();

    const result = await db.deleteProjectApiKey(keyId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    res.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete API key",
    });
  }
});

/**
 * POST /projects/:projectId/api-keys/:keyId/regenerate
 * Regenerate an API key
 */
router.post(
  "/:keyId/regenerate",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, keyId } = req.params as {
        projectId: string;
        keyId: string;
      };
      const db = DatabaseService.getInstance();

      const apiKey = await db.regenerateApiKey(projectId, keyId);

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: "API key not found",
        });
      }

      res.json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate API key",
      });
    }
  }
);

export default router;
