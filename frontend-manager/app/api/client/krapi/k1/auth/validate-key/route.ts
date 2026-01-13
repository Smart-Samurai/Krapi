import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Validate API Key
 * 
 * POST /api/client/krapi/k1/auth/validate-key
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.api_key) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    // CLIENT ROUTE: Use SDK to connect to frontend URL and call proxy route
    const clientSdk = await getClientSdkClient();

    let result: { valid: boolean; key_info: unknown } | null = null;
    try {
      const validateResult = await clientSdk.apiKeys.validateKey(body.api_key);
      if (validateResult && typeof validateResult === 'object' && 'valid' in validateResult) {
        result = validateResult as { valid: boolean; key_info: unknown };
      } else {
        result = { valid: false, key_info: null };
      }
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes("session") ||
        error.message.includes("expired") ||
        error.message.includes("Invalid or expired")
      )) {
        return NextResponse.json({
          success: true,
          valid: false,
          key_info: null,
          error: "Session expired - please log in again to validate API key",
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      valid: result.valid,
      key_info: result.key_info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate API key",
      },
      { status: 500 }
    );
  }
}










