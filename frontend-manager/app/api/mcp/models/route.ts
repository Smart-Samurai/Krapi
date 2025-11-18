import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * MCP Models API Route
 * 
 * Connects directly to OpenAI-compatible LLM endpoints (LM Studio, Ollama, OpenAI)
 * to fetch available models.
 * POST /api/mcp/models
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

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint URL is required" },
        { status: 400 }
      );
    }

    // Build the models endpoint URL based on provider
    let modelsUrl: string;
    if (provider === "ollama") {
      // Ollama uses /api/tags for model list
      modelsUrl = `${endpoint}/api/tags`;
    } else {
      // OpenAI and LM Studio use OpenAI-compatible /v1/models endpoint
      const baseUrl = endpoint.endsWith("/v1") ? endpoint : `${endpoint}/v1`;
      modelsUrl = `${baseUrl}/models`;
    }

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key for OpenAI (LM Studio and Ollama typically don't need it)
    if (provider === "openai" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Fetch models from the LLM provider
    let response: Response;
    try {
      response = await fetch(modelsUrl, {
        method: "GET",
        headers,
      });
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error("Failed to connect to LLM endpoint:", fetchError);
      return NextResponse.json(
        { success: false, error: `Failed to connect to ${provider} endpoint: ${endpoint}` },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.error(`LLM endpoint returned ${response.status}:`, errorText);
      return NextResponse.json(
        { success: false, error: `LLM endpoint returned ${response.status}: ${errorText.substring(0, 200)}` },
        { status: response.status }
      );
    }

    interface ModelResponse {
      models?: Array<{ name: string }>;
      data?: Array<{ id: string }>;
    }

    interface Model {
      id: string;
      name?: string;
    }

    let data: ModelResponse;
    try {
      data = await response.json();
    } catch (_parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from LLM endpoint" },
        { status: 500 }
      );
    }

    // Transform response to consistent format
    let models: Model[] = [];
    
    if (provider === "ollama") {
      // Ollama returns { models: [{ name, ... }] }
      models = (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
      }));
    } else {
      // OpenAI/LM Studio return { data: [{ id, ... }] }
      models = (data.data || []).map((m) => ({
        id: m.id,
        name: m.id,
      }));
    }

    return NextResponse.json({
      success: true,
      models,
    });
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

