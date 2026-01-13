import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Create test project
 * POST /api/testing/create-project
 *
 * PROXY ROUTE: Connects to backend URL for testing operations
 */
export async function POST(_request: NextRequest) {
  try {
    const backendSdk = await getBackendSdkClient();
    const project = await backendSdk.testing.createTestProject();
    return NextResponse.json({
      success: true,
      data: project,
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

