import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Change Password API Route
 *
 * POST /api/auth/change-password - Change user password
 * Forwards to backend /krapi/k1/auth/change-password
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authorization = request.headers.get("authorization");
    
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);
    const body = await request.json();

    if (!body.current_password || !body.new_password) {
      return NextResponse.json(
        { success: false, error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Call backend directly for password change
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3470'}/krapi/k1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_password: body.current_password,
        new_password: body.new_password,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Password change failed' },
        { status: response.status }
      );
    }
    
    const changeResult = await response.json();
    return NextResponse.json(changeResult);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Password change failed",
      },
      { status: 500 }
    );
  }
}
