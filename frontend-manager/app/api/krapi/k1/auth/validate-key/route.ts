/**
 * Validate API Key API Route
 * POST /api/krapi/k1/auth/validate-key
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.api_key) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // Note: validate-key endpoint should work with API key authentication
    const backendSdk = await getBackendSdkClient();

    // Use SDK apiKeys.validateKey() method
    let result: { valid: boolean; key_info: unknown } | null = null;
    try {
      const validateResult = await backendSdk.apiKeys.validateKey(body.api_key);
      if (validateResult && typeof validateResult === 'object' && 'valid' in validateResult) {
        result = validateResult as { valid: boolean; key_info: unknown };
      } else {
        result = { valid: false, key_info: null };
      }
    } catch (error) {
      // If SDK method fails with session/auth error, the session might have expired
      // But we can still try to validate the key by checking if it's a session error
      if (error instanceof Error && (
        error.message.includes("session") ||
        error.message.includes("expired") ||
        error.message.includes("Invalid or expired")
      )) {
        // Session expired - but we can still validate the key
        // Return a response indicating we need to check the key differently
        // For now, return invalid since we can't validate without proper auth
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



