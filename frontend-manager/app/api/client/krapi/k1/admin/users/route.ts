import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Admin Users
 * 
 * GET /api/client/krapi/k1/admin/users - Get all admin users
 * POST /api/client/krapi/k1/admin/users - Create admin user
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

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

    const searchParams = request.nextUrl.searchParams;
    const options: {
      limit?: number;
      offset?: number;
    } = {};

    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const users = await clientSdk.admin.getAllUsers(options);

    return NextResponse.json({
      success: true,
      data: Array.isArray(users) ? users : [users],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch admin users",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userData = await request.json();
    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const user = await clientSdk.admin.createUser(userData);

    return NextResponse.json({
      success: true,
      data: user,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create admin user",
      },
      { status: 500 }
    );
  }
}

