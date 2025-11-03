import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

/**
 * Auth API Routes
 *
 * POST /api/auth/login - User login
 * POST /api/auth/register - User registration
 * POST /api/auth/logout - User logout
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Action parameter is required (login, register, logout)",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    switch (action) {
      case "login":
        if (!body.username || !body.password) {
          return NextResponse.json(
            { success: false, error: "Username and password are required" },
            { status: 400 }
          );
        }

        // Call backend directly for admin login
        const response = await fetch(
          `${
            process.env.BACKEND_URL || "http://localhost:3470"
          }/krapi/k1/auth/admin/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: body.username,
              password: body.password,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return NextResponse.json(
            {
              success: false,
              error: errorData.error || "Authentication failed",
            },
            { status: response.status }
          );
        }

        const session = await response.json();
        return NextResponse.json(session);

      case "register":
        if (!body.username || !body.email || !body.password) {
          return NextResponse.json(
            {
              success: false,
              error: "Username, email, and password are required",
            },
            { status: 400 }
          );
        }

        // Register using SDK
        const user = await serverSdk.auth.register({
          username: body.username,
          email: body.email,
          password: body.password,
        });
        return NextResponse.json(
          { success: true, data: user },
          { status: 201 }
        );

      case "logout":
        if (!body.session_id) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        // Logout using SDK
        await serverSdk.auth.logout(body.session_id);
        return NextResponse.json({
          success: true,
          message: "Logged out successfully",
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use: login, register, or logout",
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 500 }
    );
  }
}
