import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for user activity timeline
 * GET /krapi/k1/activity/user/timeline
 *
 * SDK-FIRST: Uses backendSDK.activity.query() with user_id filter.
 * Note: SDK doesn't have getUserTimeline() method, so we use query() instead.
 */
export class UserTimelineHandler {
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

      const userId = req.query.user_id as string | undefined;
      const projectId = req.query.project_id as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      // SDK-FIRST: Use backendSDK.activity.query() with user_id filter
      // Note: ActivityLogger.query() requires user_id to be a string
      if (!userId) {
        res.status(400).json({
          success: false,
          error: "User ID is required for timeline",
        });
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // BackendSDK.activity.query() returns ActivityLog[] directly (adapter unwraps { logs, total })
      const queryResult = await this.backendSDK.activity.query({
        user_id: userId,
        ...(projectId ? { project_id: projectId } : {}),
        start_date: startDate,
        limit: limit || 50,
      });

      // LOG: What we received from backendSDK
      console.log("[BACKEND] activity.timeline received from backendSDK:", {
        type: typeof queryResult,
        isArray: Array.isArray(queryResult),
        isNull: queryResult === null,
        isUndefined: queryResult === undefined,
        keys:
          queryResult && typeof queryResult === "object"
            ? Object.keys(queryResult)
            : [],
        length: Array.isArray(queryResult) ? queryResult.length : "N/A",
        sample:
          Array.isArray(queryResult) && queryResult.length > 0
            ? queryResult[0]
            : queryResult,
        fullResult: JSON.stringify(queryResult),
      });

      // BackendSDK.activity.query() should return ActivityLog[] directly
      let timeline: unknown[] = [];
      if (Array.isArray(queryResult)) {
        timeline = queryResult;
      } else {
        // If result is not an array, something went wrong - log it for debugging
        console.error("BackendSDK.activity.query() returned non-array:", {
          type: typeof queryResult,
          isArray: Array.isArray(queryResult),
          queryResult,
        });
        timeline = [];
      }

      // CRITICAL: Always ensure timeline is an array (never null/undefined/object)
      if (!Array.isArray(timeline)) {
        timeline = [];
      }

      const response = {
        success: true,
        data: timeline,
      };

      // LOG: What we're returning
      console.log("[BACKEND] activity.timeline returning:", {
        success: response.success,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
        fullResponse: JSON.stringify(response),
      });

      res.json(response);
    } catch (error) {
      console.error("User timeline error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get user timeline",
      });
    }
  }
}
