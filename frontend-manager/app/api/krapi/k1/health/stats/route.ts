/**
 * Health Statistics API Route
 * GET /api/krapi/k1/health/stats
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

    // Use SDK health.getStats() method
    const stats = await backendSdk.health.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get health stats",
      },
      { status: 500 }
    );
  }
}



