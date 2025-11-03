import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id");
    const project_id = searchParams.get("project_id");
    const action = searchParams.get("action");
    const resource_type = searchParams.get("resource_type");
    const resource_id = searchParams.get("resource_id");
    const severity = searchParams.get("severity");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (user_id) queryParams.append("user_id", user_id);
    if (project_id) queryParams.append("project_id", project_id);
    if (action) queryParams.append("action", action);
    if (resource_type) queryParams.append("resource_type", resource_type);
    if (resource_id) queryParams.append("resource_id", resource_id);
    if (severity) queryParams.append("severity", severity);
    if (start_date) queryParams.append("start_date", start_date);
    if (end_date) queryParams.append("end_date", end_date);
    if (limit) queryParams.append("limit", limit);
    if (offset) queryParams.append("offset", offset);

    // Call backend directly
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${backendUrl}/admin/activity/query?${queryParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to query activity logs",
          details: errorData.error || "Backend error",
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    
    return NextResponse.json(
      {
        error: "Failed to query activity logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
