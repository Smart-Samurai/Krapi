import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * MCP Model Capabilities API Route
 * 
 * Get capabilities of an LLM model from providers (openai, ollama, lmstudio)
 * POST /api/mcp/model-capabilities
 * 
 * SDK-FIRST ARCHITECTURE: Uses SDK mcp.modelCapabilities() method.
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

    // SDK-FIRST: Use SDK mcp.modelCapabilities() method
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.mcp.modelCapabilities(provider, endpoint, apiKey);

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

