/**
 * Create Default Admin API Route
 * POST /api/krapi/k1/database/create-default-admin
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 * 
 * Note: This is a server-only operation, but we proxy it through the frontend.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK database.createDefaultAdmin() method
    // Note: This method is only available in server mode, but the backend endpoint handles it
    const result = await backendSdk.database.createDefaultAdmin();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      adminUser: result.adminUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create default admin",
      },
      { status: 500 }
    );
  }
}



