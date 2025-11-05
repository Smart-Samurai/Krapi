/**
 * Email Status API Route
 * GET /api/krapi/k1/email/status/[emailId]
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const response = await fetch(`${backendUrl}/email/status/${resolvedParams.emailId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to get email status" },
        { status: response.status }
      );
    }

    const statusData = await response.json();
    return NextResponse.json(statusData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to get email status" },
      { status: 500 }
    );
  }
}

