import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * System health check
 * GET /api/health/check
 *
 * PROXY ROUTE: Connects to backend URL for health check
 * SDK 0.4.0+: Uses health.check() which returns { healthy, message, details?, version }
 */
export async function GET(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    // SDK 0.4.0+: Use health.check() method
    const healthResult = await backendSdk.health.check();

    // Return health status with details
    const healthData: Record<string, unknown> = {
      healthy: healthResult.healthy,
      status: healthResult.healthy ? "healthy" : "unhealthy",
      message: healthResult.message,
      version: healthResult.version,
      timestamp: new Date().toISOString(),
    };

    // Include detailed health if available
    if (healthResult.details) {
      healthData.details = healthResult.details;
    }

    return NextResponse.json(healthData);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
