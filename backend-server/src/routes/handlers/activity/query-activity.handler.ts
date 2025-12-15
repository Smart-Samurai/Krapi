import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for querying activity logs
 * GET /krapi/k1/activity/query
 * POST /krapi/k1/activity/query
 */
export class QueryActivityHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      // Extract query parameters from either query string (GET) or body (POST)
      const queryOptions = req.method === "GET" ? req.query : req.body;

      // SDK should have fixed hanging issues, but keep timeout as safety (increased to 5s)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Activity query timeout after 5s")),
          5000
        );
      });

      // BackendSDK.activity.query() returns ActivityLog[] directly (adapter unwraps { logs, total })
      const result = (await Promise.race([
        this.backendSDK.activity.query(queryOptions),
        timeoutPromise,
      ])) as unknown[] | null | undefined;

      // LOG: What we received from backendSDK
      console.log("[BACKEND] activity.query received from backendSDK:", {
        type: typeof result,
        isArray: Array.isArray(result),
        isNull: result === null,
        isUndefined: result === undefined,
        keys: result && typeof result === "object" ? Object.keys(result) : [],
        length: Array.isArray(result) ? result.length : "N/A",
        sample: Array.isArray(result) && result.length > 0 ? result[0] : result,
        fullResult: JSON.stringify(result),
      });

      // BackendSDK.activity.query() should return ActivityLog[] directly
      // The adapter in server mode calls logger.query() which returns { logs, total }
      // Then the adapter extracts result.logs and returns it as an array
      let logs: unknown[] = [];
      if (Array.isArray(result)) {
        logs = result;
      } else {
        // If result is not an array, something went wrong - log it for debugging
        console.error("BackendSDK.activity.query() returned non-array:", {
          type: typeof result,
          isArray: Array.isArray(result),
          result,
        });
        logs = [];
      }

      // CRITICAL: Always ensure logs is an array (never null/undefined/object)
      if (!Array.isArray(logs)) {
        logs = [];
      }

      const response = {
        success: true,
        data: logs,
      };

      // LOG: What we're returning
      console.log("[BACKEND] activity.query returning:", {
        success: response.success,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
        fullResponse: JSON.stringify(response),
      });

      res.status(200).json(response);
    } catch (error) {
      console.error("Error querying activity logs:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to query activity logs",
        details: errorMessage,
      });
    }
  }
}
