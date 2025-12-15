/**
 * Database Repair API Route
 * POST /api/krapi/k1/health/repair
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

    // SDK-FIRST: Use backendSDK.health.repairDatabase() for database repair
    // If repairDatabase doesn't exist, fall back to health.autoFix() or database.autoFix()
    const result = typeof backendSdk.health?.repairDatabase === 'function'
      ? await backendSdk.health.repairDatabase()
      : typeof backendSdk.health?.autoFix === 'function'
      ? await backendSdk.health.autoFix()
      : await backendSdk.database.autoFix();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Database repair failed",
      },
      { status: 500 }
    );
  }
}



