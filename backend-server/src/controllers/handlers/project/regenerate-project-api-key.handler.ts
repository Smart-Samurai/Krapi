import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for regenerating project API key
 * POST /krapi/k1/projects/:projectId/regenerate-api-key
 * 
 * Uses SDK projects.regenerateProjectApiKey() method for consistent architecture.
 */
export class RegenerateProjectApiKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID: ID is empty or invalid",
          code: "INVALID_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Use SDK projects.regenerateProjectApiKey() method
      const result = await this.backendSDK.projects.regenerateProjectApiKey(sanitizedId);

      if (!result || !result.newApiKey) {
        res.status(404).json({
          success: false,
          error: "Project not found or API key regeneration failed",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: { api_key: result.newApiKey },
        message: "API key regenerated successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to regenerate API key",
      } as ApiResponse);
    }
  }
}

