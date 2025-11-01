/**
 * Activity Statistics API Route
 * GET /api/krapi/k1/activity/stats
 *
 * Forwards to backend /krapi/k1/admin/activity/stats
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    const backendUrl =
      process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const statsUrl = `${backendUrl}/krapi/k1/admin/activity/stats?${queryParams.toString()}`;

    const response = await fetch(statsUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to get activity statistics",
        },
        { status: response.status }
      );
    }

    const stats = await response.json();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get activity statistics error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get activity statistics",
      },
      { status: 500 }
    );
  }
}

