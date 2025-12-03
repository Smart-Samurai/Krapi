/**
 * Activity Cleanup API Route
 * POST /api/krapi/k1/activity/cleanup
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const daysToKeep = body.days_to_keep || 30;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Try cleanup() first, then fall back to cleanOldLogs()
    // SDK may use either method name
    const activityAdapter = backendSdk.activity as unknown as {
      cleanup?: (daysToKeep?: number) => Promise<{ success: boolean; deleted_count: number } | number>;
      cleanOldLogs?: (daysToKeep?: number) => Promise<number>;
    };
    
    let result: { success: boolean; deleted_count: number } | number | undefined;
    
    if (typeof activityAdapter.cleanup === "function") {
      result = await activityAdapter.cleanup(daysToKeep);
    } else if (typeof activityAdapter.cleanOldLogs === "function") {
      result = await activityAdapter.cleanOldLogs(daysToKeep);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Activity cleanup method not available in SDK",
        },
        { status: 501 }
      );
    }
    
    // Normalize response format - SDK may return number or object
    let deletedCount: number;
    if (typeof result === "number") {
      deletedCount = result;
    } else if (result && typeof result === "object" && "deleted_count" in result) {
      deletedCount = result.deleted_count;
    } else {
      deletedCount = 0;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        success: true,
        deleted_count: deletedCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cleanup activity logs",
      },
      { status: 500 }
    );
  }
}

