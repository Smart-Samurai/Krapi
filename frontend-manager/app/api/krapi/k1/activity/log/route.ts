import { NextRequest, NextResponse } from "next/server";

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

    // Call backend directly
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/admin/activity/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to log activity",
          details: errorData.error || "Backend error",
        },
        { status: response.status }
      );
    }

    const activityLog = await response.json();
    return NextResponse.json(activityLog, { status: 201 });
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
