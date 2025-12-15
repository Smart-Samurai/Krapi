/**
 * Health Diagnostics API Route
 * POST /api/krapi/k1/health/diagnostics
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 * 
 * The backend now uses a custom DiagnosticsService that runs fast (< 1s)
 * and doesn't hang. This route just proxies the request to the backend.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

export async function POST(_request: NextRequest): Promise<Response> {
  try {
    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await getBackendSdkClient();

    // Backend now uses custom DiagnosticsService - fast and reliable
    // Use 2s timeout (backend completes in < 1s, but allow buffer)
    const diagnostics = await Promise.race([
      backendSdk.health.runDiagnostics(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Diagnostics timeout after 2s")), 2000);
      }),
    ]);

    // Handle ApiResponse format: { success: boolean, data: {...} } or direct format
    let diagnosticsData: unknown;
    if (diagnostics && typeof diagnostics === 'object' && 'data' in diagnostics) {
      // ApiResponse format
      diagnosticsData = (diagnostics as { data: unknown }).data;
    } else {
      // Direct format - SDK adapter already unwrapped
      diagnosticsData = diagnostics;
    }

    return NextResponse.json({
      success: true,
      data: diagnosticsData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Health diagnostics failed",
      },
      { status: 500 }
    );
  }
}



