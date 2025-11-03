/**
 * Email Analytics API Route
 * GET /api/krapi/k1/email/analytics
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    const response = await fetch(
      `${backendUrl}/email/analytics?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to get email analytics" },
        { status: response.status }
      );
    }

    const analyticsData = await response.json();
    return NextResponse.json(analyticsData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to get email analytics" },
      { status: 500 }
    );
  }
}

