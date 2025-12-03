/**
 * Recent Activity API Route
 * GET /api/krapi/k1/activity/recent
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);
    const { searchParams } = new URL(request.url);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 10;
    const projectId = searchParams.get("project_id") || undefined;

    // SDK adapter.query() returns ActivityLog[] directly
    const queryResult = await sdk.activity.query({
      ...(projectId ? { project_id: projectId } : {}),
      limit: limit,
    });

    // LOG: What we received from SDK
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.recent received from SDK:", {
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

    // SDK adapter should always return an array
    if (!Array.isArray(queryResult)) {
      // eslint-disable-next-line no-console
      console.error("SDK activity.query() returned non-array:", {
        type: typeof queryResult,
        isArray: Array.isArray(queryResult),
        keys:
          queryResult && typeof queryResult === "object"
            ? Object.keys(queryResult)
            : [],
        queryResult,
      });
      throw new Error(
        `SDK activity.query() returned unexpected format: ${JSON.stringify(
          queryResult
        )}. Expected array.`
      );
    }

    // Return in ApiResponse format so SDK adapter can properly unwrap it
    const response = {
      success: true,
      data: queryResult,
    };

    // LOG: What we're returning
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.recent returning:", {
      success: response.success,
      dataType: typeof response.data,
      dataIsArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
      fullResponse: JSON.stringify(response),
    });

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting recent activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get recent activity",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
