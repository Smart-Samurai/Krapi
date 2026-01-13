import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Database health check
 * GET /api/health/database
 *
 * PROXY ROUTE: Connects to backend URL for database health check
 */
export async function GET(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    const health = await backendSdk.health.checkDatabase();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        message: "Database health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

