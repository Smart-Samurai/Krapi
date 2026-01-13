import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Cleanup test data
 * POST /api/testing/cleanup
 *
 * PROXY ROUTE: Connects to backend URL for testing operations
 */
export async function POST(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    const result = await backendSdk.testing.cleanup();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

