/**
 * Database Health Check API Route
 * GET /api/krapi/k1/health/database
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await getBackendSdkClient();

    // Use SDK health.checkDatabase() method
    const dbHealth = await backendSdk.health.checkDatabase();

    return NextResponse.json({
      success: true,
      data: {
        healthy: dbHealth.healthy,
        message: dbHealth.message,
        details: dbHealth.details,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        error: error instanceof Error ? error.message : "Database health check failed",
      },
      { status: 500 }
    );
  }
}



