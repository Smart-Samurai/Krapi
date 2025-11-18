import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * MCP Model Capabilities API Route
 * 
 * Proxies requests to the backend MCP model-capabilities endpoint with authentication
 * POST /api/mcp/model-capabilities
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

    const response = await fetch(`${backendUrl}/krapi/k1/mcp/model-capabilities`, {
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
      console.error("Backend error for model capabilities:", errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || errorData.message || "Failed to check model capabilities" },
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

