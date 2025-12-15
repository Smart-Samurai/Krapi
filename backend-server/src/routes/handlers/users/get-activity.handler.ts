import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting user activity
 * GET /krapi/k1/projects/:projectId/users/:userId/activity
 * 
 * SDK-FIRST: Uses backendSDK.users.getActivity() instead of custom implementation.
 */
export class GetUserActivityHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      const projectId = req.params.projectId;
      const userId = req.params.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      if (!projectId || !userId) {
        res.status(400).json({
          success: false,
          error: "Project ID and user ID are required",
        });
        return;
      }

      // SDK-FIRST: Use backendSDK.activity.query() with user_id filter
      // Note: UsersService doesn't have getActivity(), but ActivityLogger has query()
      const activityResult = await this.backendSDK.activity.query({
        user_id: userId,
        project_id: projectId,
        ...(startDate ? { start_date: new Date(startDate) } : {}),
        ...(endDate ? { end_date: new Date(endDate) } : {}),
        ...(limit ? { limit } : {}),
      });
      const activity = activityResult.logs || [];

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      console.error("Get user activity error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get user activity",
      });
    }
  }
}


