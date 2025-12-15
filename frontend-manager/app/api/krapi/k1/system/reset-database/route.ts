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

    // TODO: SDK needs system.resetDatabase() method - this is a known architecture violation
    // Until SDK adds this method, we must use fetch. This violates SDK-first architecture rule.
    // When SDK adds system.resetDatabase(), replace this with: await sdk.system.resetDatabase();
    // 
    // For now, using config.backend.url instead of process.env for consistency
    const { config } = await import("@/lib/config");
    const backendUrl = config.backend.url;
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















