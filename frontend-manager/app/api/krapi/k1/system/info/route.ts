/**
 * System Info API Route
 * GET /api/krapi/k1/system/info
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

    // Use SDK system.getInfo() method (adapter method returns SystemInfo directly)
    // Frontend SDK uses SystemAdapter which has getInfo() that returns SystemInfo
    const systemInfo = await backendSdk.system.getInfo();
    // Cast through unknown first to avoid type error
    let info = (systemInfo as unknown) as Record<string, unknown>;

    // Ensure version field exists - if not, add default
    // Note: Can't use require() in Next.js API routes at build time
    if (!info.version) {
      info.version = '1.0.0'; // Default version if SDK doesn't provide it
    }

    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get system info",
      },
      { status: 500 }
    );
  }
}


