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

    // Make direct HTTP call to backend since SDK may not have this method yet
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3470";
    const response = await fetch(`${backendUrl}/krapi/k1/system/reset-database`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Reset failed" }));
      return NextResponse.json(
        { success: false, error: error.error || "Failed to reset database" },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result.data,
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













