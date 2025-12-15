/**
 * API Keys Routes
 *
 * Handles API key management for projects.
 * Base path: /krapi/k1/projects/:projectId/api-keys
 *
 * Routes:
 * - GET / - Get all API keys for a project
 * - POST / - Create a new API key
 * - GET /:keyId - Get API key by ID
 * - PUT /:keyId - Update API key
 * - DELETE /:keyId - Delete API key
 *
 * All routes require authentication and project access.
 *
 * @module routes/api-keys.routes
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router } from "express";

import { authenticateProject } from "@/middleware/auth.middleware";
import { validateProjectAccess } from "@/middleware/validation.middleware";

const router: Router = Router();

// BackendSDK instance - will be initialized from main router
let backendSDK: BackendSDK;

/**
 * Initialize BackendSDK for API keys routes
 *
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeApiKeysSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

// Apply authentication middleware to all API key routes
router.use(
  authenticateProject as unknown as (
    req: unknown,
    res: unknown,
    next: unknown
  ) => unknown
);
router.use(
  validateProjectAccess as unknown as (
    req: unknown,
    res: unknown,
    next: unknown
  ) => unknown
);

/**
 * Get all API keys for a project
 *
 * GET /krapi/k1/projects/:projectId/api-keys
 *
 * Retrieves all API keys for the specified project.
 * Requires authentication and project access.
 *
 * @route GET /
 * @param {string} projectId - Project ID (from parent route)
 * @returns {Object} Array of API keys
 */
router.get("/", async (req, res) => {
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

    return res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get API keys",
    });
  }
});

/**
 * Create a new API key for a project
 *
 * POST /krapi/k1/projects/:projectId/api-keys
 *
 * Creates a new API key for the project with specified permissions.
 * Requires authentication and project write access.
 *
 * @route POST /
 * @param {string} projectId - Project ID (from parent route)
 * @body {string} name - API key name
 * @body {string} [description] - API key description
 * @body {string[]} permissions - API key permissions/scopes
 * @body {string} [expires_at] - Expiration date (ISO string)
 * @returns {Object} Created API key with key string (shown only once)
 */
router.post("/", async (req, res) => {
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
    return res.json({
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
    return res.status(500).json({
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
router.get("/:keyId", async (req, res) => {
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
    return res.json({
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
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get API key",
    });
  }
});

/**
 * PUT /projects/:projectId/api-keys/:keyId
 * Update an API key
 */
router.put("/:keyId", async (req, res) => {
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

    return res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    return res.status(500).json({
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
router.delete("/:keyId", async (req, res) => {
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

    return res.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
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
router.post("/:keyId/regenerate", async (req, res) => {
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

    return res.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to regenerate API key",
    });
  }
});

export default router;
