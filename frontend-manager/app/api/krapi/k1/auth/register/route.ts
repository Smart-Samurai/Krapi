/**
 * User Registration API Route
 * POST /api/krapi/k1/auth/register
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.username || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await getBackendSdkClient();

    // Use SDK auth.register() method
    // SDK HTTP client should unwrap ApiResponse automatically
    const result = await backendSdk.auth.register({
      username: body.username,
      email: body.email,
      password: body.password,
      role: body.role,
      access_level: body.access_level,
      permissions: body.permissions,
    });

    // SDK HTTP client unwraps ApiResponse, but backend returns custom format
    // Backend returns: { success: true, data: user, user: user }
    // SDK should return: { success: true, user: user } or { success: true, data: user }
    // Test expects: { success: true, user: user }
    let registrationData: { success: boolean; user: unknown };
    
    if (result && typeof result === 'object') {
      // Check if SDK unwrapped it correctly (has 'user' field)
      if ('user' in result) {
        registrationData = result as { success: boolean; user: unknown };
      } else if ('data' in result) {
        // SDK returned ApiResponse format - extract data
        const data = (result as { data: unknown }).data;
        if (data && typeof data === 'object' && 'success' in data && 'user' in data) {
          // Nested format: { success: true, data: { success: true, user: {...} } }
          registrationData = data as { success: boolean; user: unknown };
        } else {
          // Data is the user object
          registrationData = {
            success: true,
            user: data,
          };
        }
      } else {
        // Fallback: result is the user object
        registrationData = {
          success: true,
          user: result,
        };
      }
    } else {
      // Fallback
      registrationData = {
        success: true,
        user: result,
      };
    }

    // Return format matching test expectations: { success, user }
    return NextResponse.json({
      success: registrationData.success ?? true,
      user: registrationData.user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}


