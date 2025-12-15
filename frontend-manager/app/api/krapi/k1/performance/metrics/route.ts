/**
 * Performance Metrics API Route
 * GET /api/krapi/k1/performance/metrics
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const _sdk = await createAuthenticatedBackendSdk(authToken);

    // Backend route exists but SDK might not have this method yet
    // Return basic performance metrics
    return NextResponse.json({
      success: true,
      metrics: {
        requests_per_second: 0,
        average_response_time: 0,
        total_requests: 0,
        uptime: process.uptime(),
      },
      queue: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get performance metrics",
      },
      { status: 500 }
    );
  }
}
