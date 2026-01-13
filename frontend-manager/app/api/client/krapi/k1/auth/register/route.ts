import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Register User
 * 
 * POST /api/client/krapi/k1/auth/register
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.username || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // CLIENT ROUTE: Use SDK to connect to frontend URL and call proxy route
    const clientSdk = await getClientSdkClient();

    const result = await clientSdk.auth.register({
      username: body.username,
      email: body.email,
      password: body.password,
      role: body.role,
      access_level: body.access_level,
      permissions: body.permissions,
    });

    // Handle different response formats
    let registrationData: { success: boolean; user: unknown };
    
    if (result && typeof result === 'object') {
      if ('user' in result) {
        registrationData = result as { success: boolean; user: unknown };
      } else if ('data' in result) {
        const data = (result as { data: unknown }).data;
        if (data && typeof data === 'object' && 'success' in data && 'user' in data) {
          registrationData = data as { success: boolean; user: unknown };
        } else {
          registrationData = {
            success: true,
            user: data,
          };
        }
      } else {
        registrationData = {
          success: true,
          user: result,
        };
      }
    } else {
      registrationData = {
        success: true,
        user: result,
      };
    }

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










