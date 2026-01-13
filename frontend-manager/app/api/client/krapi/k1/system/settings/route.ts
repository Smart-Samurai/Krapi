/**
 * CLIENT ROUTE: System Settings
 * 
 * GET /api/client/krapi/k1/system/settings - Get system settings
 * PUT /api/client/krapi/k1/system/settings - Update system settings
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use client SDK (connects to frontend URL, calls proxy route via SDK)
    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const settings = await clientSdk.system.getSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch system settings",
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
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // SDK-FIRST: Use client SDK (connects to frontend URL, calls proxy route via SDK)
    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const settings = await clientSdk.system.updateSettings(body);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update system settings",
      },
      { status: 500 }
    );
  }
}

