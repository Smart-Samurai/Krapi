import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Health Check API Route (SDK-compatible path)
 *
 * GET /api/krapi/k1/health - System health check
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // This avoids circular dependencies because it's a separate SDK instance
    const backendSdk = await getBackendSdkClient();

    // SDK 0.4.0+: Use health.check() which returns { healthy, message, details?, version }
    const healthResult = await backendSdk.health.check();

    // Return SDK-compatible format: { success: true, data: { healthy, message, version, details? } }
    // SDK adapter expects response.data to contain the SystemHealth object
    return NextResponse.json({
      success: true,
      data: {
      healthy: healthResult.healthy,
      message: healthResult.message,
      version: healthResult.version,
        details: healthResult.details,
      },
    });
  } catch (error) {
    // If SDK fails, return basic health status
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        frontend: {
          status: "running",
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || "development",
        },
      },
      { status: 500 }
    );
  }
}
