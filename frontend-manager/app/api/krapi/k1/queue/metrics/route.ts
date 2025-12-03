/**
 * Queue Metrics API Route
 * GET /api/krapi/k1/queue/metrics
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
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
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK database.getQueueMetrics() method
    // SDK adapter unwraps ApiResponse automatically
    // Test expects metrics directly: { queueSize, processingCount, totalProcessed, ... }
    const metrics = await backendSdk.database.getQueueMetrics();

    // SDK returns QueueMetrics directly (adapter unwraps ApiResponse)
    // Return metrics directly to match test expectations
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get queue metrics",
      },
      { status: 500 }
    );
  }
}
