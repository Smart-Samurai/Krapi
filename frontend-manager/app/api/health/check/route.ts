import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * System health check
 * GET /api/health/check
 *
 * SDK 0.4.0+: Uses health.check() which returns { healthy, message, details?, version }
 */
export async function GET(_request: NextRequest) {
  try {
    // SDK 0.4.0+: Use health.check() method
    const healthResult = await krapi.health.check();

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
