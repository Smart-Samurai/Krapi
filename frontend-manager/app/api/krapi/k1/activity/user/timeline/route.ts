/**
 * User Activity Timeline API Route
 * GET /api/krapi/k1/activity/user/timeline
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
    const userId = searchParams.get("user_id") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const days = searchParams.get("days")
      ? parseInt(searchParams.get("days")!)
      : 30;

    // SDK 0.4.0+: No getUserTimeline - use query with user_id filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // SDK adapter.query() returns ActivityLog[] directly
    const timelineResult = await sdk.activity.query({
      user_id: userId,
      start_date: startDate,
      limit,
    });

    // LOG: What we received from SDK
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.timeline received from SDK:", {
      type: typeof timelineResult,
      isArray: Array.isArray(timelineResult),
      isNull: timelineResult === null,
      isUndefined: timelineResult === undefined,
      keys:
        timelineResult && typeof timelineResult === "object"
          ? Object.keys(timelineResult)
          : [],
      length: Array.isArray(timelineResult) ? timelineResult.length : "N/A",
      sample:
        Array.isArray(timelineResult) && timelineResult.length > 0
          ? timelineResult[0]
          : timelineResult,
      fullResult: JSON.stringify(timelineResult),
    });

    // SDK adapter should always return an array
    if (!Array.isArray(timelineResult)) {
      // eslint-disable-next-line no-console
      console.error("SDK activity.query() returned non-array:", {
        type: typeof timelineResult,
        isArray: Array.isArray(timelineResult),
        keys:
          timelineResult && typeof timelineResult === "object"
            ? Object.keys(timelineResult)
            : [],
        timelineResult,
      });
      throw new Error(
        `SDK activity.query() returned unexpected format: ${JSON.stringify(
          timelineResult
        )}. Expected array.`
      );
    }

    // Return in ApiResponse format so SDK adapter can properly unwrap it
    const response = {
      success: true,
      data: timelineResult,
    };

    // LOG: What we're returning
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.timeline returning:", {
      success: response.success,
      dataType: typeof response.data,
      dataIsArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
      fullResponse: JSON.stringify(response),
    });

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting user timeline:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get user timeline",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
