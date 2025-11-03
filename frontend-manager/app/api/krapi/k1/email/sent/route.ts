/**
 * List Sent Emails API Route
 * GET /api/krapi/k1/email/sent
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    const response = await fetch(
      `${backendUrl}/email/sent?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to list sent emails" },
        { status: response.status }
      );
    }

    const emailsData = await response.json();
    return NextResponse.json(emailsData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to list sent emails" },
      { status: 500 }
    );
  }
}

