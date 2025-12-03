import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const {
      user_id,
      project_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent,
      severity,
      metadata,
    } = await request.json();

    // Validate required fields
    if (!action || !resource_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: action and resource_type are required",
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const clientIP =
      ip_address ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip");
    const clientUserAgent = user_agent || request.headers.get("user-agent");

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const activityResult = await sdk.activity.log({
      user_id,
      project_id,
      action,
      resource_type,
      resource_id,
      details: details || {},
      ip_address: clientIP as string,
      user_agent: clientUserAgent as string,
      severity: severity || "info",
      metadata: metadata || {},
    });

    // SDK returns activity object directly (adapter unwraps ApiResponse)
    // Backend returns { success: true, data: activity }
    // Frontend should return the same format so SDK adapter can unwrap it
    let activity: Record<string, unknown>;
    if (
      activityResult &&
      typeof activityResult === "object" &&
      activityResult !== null
    ) {
      if ("data" in activityResult) {
        // ApiResponse format - extract data
        const data = (activityResult as { data: unknown }).data;
        if (data && typeof data === "object" && data !== null) {
          activity = data as Record<string, unknown>;
        } else {
          // Data is null/undefined, create from request
          activity = {
            id: `activity_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            action,
            resource_type,
            resource_id,
            timestamp: new Date().toISOString(),
          };
        }
      } else {
        // Direct format - SDK adapter already unwrapped
        activity = activityResult as unknown as Record<string, unknown>;
      }
    } else {
      // Fallback - create minimal activity object
      activity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        resource_type,
        resource_id,
        timestamp: new Date().toISOString(),
      };
    }

    // Ensure activity has required fields
    if (
      !activity.id ||
      (typeof activity.id === "string" && activity.id.trim() === "")
    ) {
      activity.id = `activity_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
    if (!activity.action) {
      activity.action = action;
    }
    if (!activity.resource_type) {
      activity.resource_type = resource_type;
    }
    if (!activity.timestamp) {
      activity.timestamp = new Date().toISOString();
    }

    // Return in ApiResponse format so SDK adapter can unwrap it
    return NextResponse.json(
      { success: true, data: activity },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to log activity",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
