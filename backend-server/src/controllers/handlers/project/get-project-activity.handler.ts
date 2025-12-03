import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Handler for getting project activity
 * GET /krapi/k1/projects/:projectId/activity
 * 
 * Uses SDK activity.query() method with project_id filter for consistent architecture.
 */
export class GetProjectActivityHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { limit = 50, days } = req.query;

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

      // Use SDK activity.query() method with project_id filter
      // Backend SDK doesn't have projects.getActivity() - use activity.query() instead
      const queryOptions: Record<string, unknown> = {
        project_id: sanitizedId,
        limit: parseInt(limit as string) || 100,
      };
      if (days) {
        // Convert days to start_date for SDK compatibility
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - parseInt(days as string));
        queryOptions.start_date = startDateObj.toISOString();
      }
      // BackendSDK.activity.query() returns ActivityLog[] directly
      const activityResult = await this.backendSDK.activity.query(queryOptions);
      
      // Ensure we have an array
      const activities = Array.isArray(activityResult) ? activityResult : [];

      res.status(200).json({
        success: true,
        data: {
          activities: activities,
          total: activities.length,
          limit: parseInt(limit as string) || 100,
          days: days ? parseInt(days as string) : undefined,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Get project activity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch project activity",
      } as ApiResponse);
    }
  }
}

