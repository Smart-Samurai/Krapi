import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * MCP Admin Chat API Route
 * 
 * Proxies requests to the backend MCP admin chat endpoint with authentication
 * POST /api/mcp/admin/chat
 * 
 * NOTE: MCP (Model Context Protocol) routes are special LLM tool calling endpoints.
 * These routes handle LLM interactions and tool calling, which is a specialized use case.
 * The comprehensive test suite does not test MCP via SDK methods - it only tests the MCP server package structure.
 * 
 * TODO: If SDK adds MCP methods (e.g., sdk.mcp.admin.chat()), replace fetch with SDK method.
 * For now, these routes remain as proxy routes since MCP is a special LLM tool calling interface.
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
    // MCP routes are special LLM tool calling endpoints - proxy to backend
    // TODO: Replace with SDK method when sdk.mcp.admin.chat() is available
    const { config } = await import("@/lib/config");
    const backendApiUrl = config.backend.getApiUrl('/mcp/admin/chat');

    const response = await fetch(backendApiUrl, {
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

