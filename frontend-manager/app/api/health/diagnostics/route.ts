import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Run system diagnostics
 * POST /api/health/diagnostics
 *
 * PROXY ROUTE: Connects to backend URL to run diagnostics
 */
export async function POST(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    const diagnostics = await backendSdk.health.runDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Diagnostics failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

