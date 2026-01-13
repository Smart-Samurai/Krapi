import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Run integration tests
 * POST /api/testing/run-tests
 *
 * PROXY ROUTE: Connects to backend URL for testing operations
 */
export async function POST(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    const results = await backendSdk.testing.runTests();
    return NextResponse.json(results);
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
