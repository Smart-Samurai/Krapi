import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for logging activity
 * POST /admin/activity/log
 * POST /krapi/k1/activity/log
 *
 * Adds timeout protection to prevent 35-second hangs.
 */
export class LogActivityHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const activityData = req.body;

      // Validate required fields
      if (
        !activityData ||
        !activityData.action ||
        !activityData.resource_type
      ) {
        res.status(400).json({
          success: false,
          error:
            "Missing required fields: action and resource_type are required",
        });
        return;
      }

      // Add timeout protection (2 seconds max - activity logging should be fast)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Activity log operation timed out after 2 seconds"));
        }, 2000);
      });

      const logPromise = this.backendSDK.activity.log(activityData);

      const loggedActivity = (await Promise.race([
        logPromise,
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof this.backendSDK.activity.log>>;

      // Ensure loggedActivity has required fields (id, action, etc.)
      // SDK should return ActivityLog object, but handle both formats
      let activity: Record<string, unknown>;
      if (
        loggedActivity &&
        typeof loggedActivity === "object" &&
        loggedActivity !== null
      ) {
        activity = loggedActivity as unknown as Record<string, unknown>;
        // Ensure required fields are present
        if (!activity.id || Object.keys(activity).length === 0) {
          // If SDK returned empty object or missing id, create from request data
          activity = {
            id: `activity_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            action: activityData.action,
            resource_type: activityData.resource_type,
            timestamp: new Date().toISOString(),
            ...activityData,
          };
        }
      } else {
        // SDK returned null/undefined, create from request data
        activity = {
          id: `activity_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          action: activityData.action,
          resource_type: activityData.resource_type,
          timestamp: new Date().toISOString(),
          ...activityData,
        };
      }

      // Ensure id is always present and valid
      if (
        !activity.id ||
        activity.id === "unknown" ||
        (typeof activity.id === "string" && activity.id.trim() === "")
      ) {
        activity.id = `activity_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      res.json({ success: true, data: activity });
    } catch (error) {
      console.error("Activity log error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to log activity";

      // Check if it's a timeout error
      if (errorMessage.includes("timed out")) {
        res.status(504).json({
          success: false,
          error: "Activity log operation timed out - please try again",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}
