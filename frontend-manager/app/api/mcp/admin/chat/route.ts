import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * MCP Admin Chat API Route
 * 
 * Proxies requests to the backend MCP admin chat endpoint with authentication
 * POST /api/mcp/admin/chat
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    const response = await fetch(`${backendUrl}/krapi/k1/mcp/admin/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorData: { error?: string; message?: string };
      try {
        const errorText = await response.text();
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Backend returned ${response.status}` };
        }
      } catch {
        errorData = { error: `Backend returned ${response.status}` };
      }
      // eslint-disable-next-line no-console
      console.error("Backend error for admin chat:", errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || errorData.message || "Chat request failed" },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from backend" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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

