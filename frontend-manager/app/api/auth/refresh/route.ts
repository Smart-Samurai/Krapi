import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Extract the session token from the Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization header with Bearer token is required",
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // For now, we'll call the backend directly since the SDK refresh method needs authentication context
    // This maintains the frontend -> backend proxy architecture
    const backendResponse = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/auth/refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to refresh session",
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();

    return NextResponse.json({
      success: true,
      session_token: responseData.data.session_token,
      expires_at: responseData.data.expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
