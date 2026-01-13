import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Repair database and fix issues
 * POST /api/health/repair
 *
 * PROXY ROUTE: Connects to backend URL to run auto-repair
 */
export async function POST(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    // Use the SDK to run auto-repair
    const repairResult = await backendSdk.health.autoFix();

    return NextResponse.json(repairResult);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Database repair failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

