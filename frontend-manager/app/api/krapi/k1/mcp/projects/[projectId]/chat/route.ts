import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * MCP Project Chat API Route
 * 
 * Proxies requests to the backend MCP project chat endpoint with authentication
 * POST /api/krapi/k1/mcp/projects/[projectId]/chat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const body = await request.json();
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    const response = await fetch(`${backendUrl}/krapi/k1/mcp/projects/${projectId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await response.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from backend" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Chat request failed" },
        { status: response.status }
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

