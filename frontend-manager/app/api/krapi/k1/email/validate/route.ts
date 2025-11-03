/**
 * Email Validation API Route
 * POST /api/krapi/k1/email/validate
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/email/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to validate email" },
        { status: response.status }
      );
    }

    const validationData = await response.json();
    return NextResponse.json(validationData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to validate email" },
      { status: 500 }
    );
  }
}

