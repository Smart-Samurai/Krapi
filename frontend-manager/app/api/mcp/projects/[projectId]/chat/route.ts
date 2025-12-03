import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Disable static generation for this dynamic route
export function generateStaticParams() {
  return [];
}

/**
 * MCP Project Chat API Route
 *
 * Proxies requests to the backend MCP project chat endpoint with authentication
 * POST /api/mcp/projects/[projectId]/chat
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
    // MCP routes proxy directly to backend (frontend client functionality)
    // SDK-FIRST: Use centralized config for backend URL
    const { config } = await import("@/lib/config");
    const backendApiUrl = config.backend.getApiUrl(`/mcp/projects/${projectId}/chat`);

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
          errorData = {
            error: errorText || `Backend returned ${response.status}`,
          };
        }
      } catch {
        errorData = { error: `Backend returned ${response.status}` };
      }
      // eslint-disable-next-line no-console
      console.error(`Backend error for project ${projectId} chat:`, errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || errorData.message || "Chat request failed",
        },
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
