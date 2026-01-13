import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Reset Database API Route
 *
 * POST /api/krapi/k1/system/reset-database - Reset all database data
 *
 * WARNING: This is a destructive operation that will delete ALL data.
 * Requires MASTER scope or ADMIN_DELETE scope.
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);

    // SDK-FIRST: Use SDK system.resetDatabase() method
    const result = await sdk.system.resetDatabase();

    return NextResponse.json({
      success: result.success,
      data: (result as { data?: unknown }).data || null,
      message: result.message || "Database reset successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reset database";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}















