/**
 * System Settings API Route
 * GET /api/krapi/k1/system/settings
 * PUT /api/krapi/k1/system/settings
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const settings = await sdk.system.getSettings();

    // SDK returns settings object directly
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch system settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const settings = await sdk.system.updateSettings(body);

    // SDK returns updated settings object directly
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update system settings",
      },
      { status: 500 }
    );
  }
}

