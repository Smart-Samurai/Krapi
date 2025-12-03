/**
 * Database Migration API Route
 * POST /api/krapi/k1/health/migrate
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

export async function POST(_request: NextRequest): Promise<Response> {
  try {
    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await getBackendSdkClient();

    // Use SDK health.migrate() method
    const result = await backendSdk.health.migrate();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}



