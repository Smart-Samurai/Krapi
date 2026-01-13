import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Get system settings
 * GET /api/system/settings
 *
 * PROXY ROUTE: Connects to backend URL with authentication
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const backendSdk = await createAuthenticatedBackendSdk(authToken);
    const settings = await backendSdk.system.getSettings();
    return NextResponse.json({
      success: true,
      data: settings,
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

/**
 * Update system settings
 * PUT /api/system/settings
 *
 * PROXY ROUTE: Connects to backend URL with authentication
 */
export async function PUT(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendSdk = await createAuthenticatedBackendSdk(authToken);
    const result = await backendSdk.system.updateSettings(body);

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

