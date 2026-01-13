import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * MCP Models API Route
 * 
 * List available models from LLM providers (openai, ollama, lmstudio)
 * POST /api/mcp/models
 * 
 * SDK-FIRST ARCHITECTURE: Uses SDK mcp.models() method.
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
    const { provider, endpoint, apiKey } = body;

    if (!provider || !endpoint) {
      return NextResponse.json(
        { success: false, error: "Provider and endpoint are required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use SDK mcp.models() method
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.mcp.models(provider, endpoint, apiKey);

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MCP models route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

