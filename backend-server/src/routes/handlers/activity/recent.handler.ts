import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for recent activity
 * GET /krapi/k1/activity/recent
 *
 * SDK-FIRST: Uses backendSDK.activity.getRecent() instead of custom implementation.
 */
export class RecentActivityHandler {
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

      const projectId = req.query.project_id as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;

      // SDK-FIRST: Use backendSDK.activity.query() - getRecent() doesn't exist
      // Query recent activity with project filter and limit
      // SDK should have fixed hanging issues, but keep timeout as safety (increased to 5s)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Activity query timeout after 5s")),
          5000
        );
      });

      // BackendSDK.activity.query() returns ActivityLog[] directly (adapter unwraps { logs, total })
      const queryResult = (await Promise.race([
        this.backendSDK.activity.query({
          ...(projectId ? { project_id: projectId } : {}),
          limit,
        }),
        timeoutPromise,
      ])) as unknown[] | null | undefined;

      // LOG: What we received from backendSDK
      console.log("[BACKEND] activity.recent received from backendSDK:", {
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
      let recent: unknown[] = [];
      if (Array.isArray(queryResult)) {
        recent = queryResult;
      } else {
        // If result is not an array, something went wrong - log it for debugging
        console.error("BackendSDK.activity.query() returned non-array:", {
          type: typeof queryResult,
          isArray: Array.isArray(queryResult),
          queryResult,
        });
        recent = [];
      }

      // CRITICAL: Always ensure recent is an array (never null/undefined/object)
      if (!Array.isArray(recent)) {
        recent = [];
      }

      const response = {
        success: true,
        data: recent,
      };

      // LOG: What we're returning
      console.log("[BACKEND] activity.recent returning:", {
        success: response.success,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
        fullResponse: JSON.stringify(response),
      });

      res.json(response);
    } catch (error) {
      console.error("Recent activity error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get recent activity";
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}
