import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
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
 * Project-specific LLM chat with tool calling against project databases
 * POST /api/mcp/projects/[projectId]/chat
 * 
 * SDK-FIRST ARCHITECTURE: Uses SDK mcp.projects.chat() method.
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
    const { messages, options } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use SDK mcp.projects.chat() method
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.mcp.projects.chat(projectId, messages, options);

    return NextResponse.json(result);
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
