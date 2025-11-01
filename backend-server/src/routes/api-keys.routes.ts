/**
 * API Keys Routes
 *
 * Handles API key management for projects
 * All routes are prefixed with /projects/:projectId/api-keys
 */

import { BackendSDK } from "@krapi/sdk";
import { Router, Request, Response } from "express";

import { authenticateProject } from "@/middleware/auth.middleware";
import { validateProjectAccess } from "@/middleware/validation.middleware";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: string;
    projectId?: string;
  };
}

const router: Router = Router();

// BackendSDK instance - will be initialized from main router
let backendSDK: BackendSDK;

// Initialize SDK function - called from main router
export const initializeApiKeysSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

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

    if (!backendSDK) {
      return res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      });
    }

    // Use SDK for API key management
    const apiKeys = await backendSDK.apiKeys.getAll(projectId);

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
    const { name, description, permissions, expires_at } = req.body;

    if (!backendSDK) {
      return res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      });
    }

    // Use SDK for API key creation
    const apiKey = await backendSDK.apiKeys.create(projectId, {
      name: name || "Project API Key",
      description: description || "API key for project access",
      scopes: permissions || ["projects:read", "collections:read"],
      expires_at:
        expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Transform response to match expected test format
    res.json({
      success: true,
      data: {
        key_id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        scopes: apiKey.scopes,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at,
        is_active: apiKey.is_active,
      },
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
    const apiKey = await backendSDK.apiKeys.get(projectId, keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: "API key not found",
      });
    }

    // Transform response to match expected test format
    res.json({
      success: true,
      data: {
        key_id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        scopes: apiKey.scopes,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at,
        is_active: apiKey.is_active,
      },
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
    const apiKey = await backendSDK.apiKeys.update(projectId, keyId, updates);

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
    const { projectId, keyId } = req.params as {
      projectId: string;
      keyId: string;
    };
    const result = await backendSDK.apiKeys.delete(projectId, keyId);

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
      const apiKey = await backendSDK.apiKeys.regenerate(projectId, keyId);

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
