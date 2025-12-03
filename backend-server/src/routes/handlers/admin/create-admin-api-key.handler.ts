import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "@/types";

/**
 * Handler for creating an admin API key
 * POST /admin/api-keys
 */
export class CreateAdminApiKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { name, permissions, expires_at } = req.body;

      // Get current user ID from authenticated request
      const currentUser = (req as AuthenticatedRequest).user;
      if (!currentUser || !currentUser.id) {
        res.status(401).json({ success: false, error: "User not authenticated" });
        return;
      }

      // Create admin API key with custom permissions
      const apiKey = await this.backendSDK.admin.createApiKey(currentUser.id, {
        name: name || "Admin API Key",
        permissions: permissions || [],
        expires_at: expires_at || undefined,
      });

      res.status(201).json({ success: true, data: apiKey });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create admin API key",
      });
    }
  }
}

