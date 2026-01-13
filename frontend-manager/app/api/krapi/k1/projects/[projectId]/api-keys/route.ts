import { NextRequest, NextResponse } from "next/server";

/* eslint-disable no-console */
import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get API keys for a project
 * GET /api/krapi/k1/projects/[projectId]/api-keys
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
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

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") || "100", 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset") || "0", 10) : undefined;

    // SDK-FIRST ARCHITECTURE: Use backend SDK client (connects to backend URL)
    let sdk;
    try {
      sdk = await createAuthenticatedBackendSdk(authToken);
    } catch (sdkError) {
      const sdkErrorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
      console.error("[API Keys Route] SDK connection error:", sdkErrorMessage, sdkError);
      return NextResponse.json(
        {
          success: false,
          error: `SDK connection failed: ${String(sdkErrorMessage)}`,
        },
        { status: 500 }
      );
    }
    
    // Verify SDK has apiKeys.getAll method
    if (!sdk.apiKeys || typeof sdk.apiKeys.getAll !== "function") {
      console.error("[API Keys Route] SDK apiKeys.getAll method not available");
      return NextResponse.json(
        {
          success: false,
          error: "API keys service not available in SDK",
        },
        { status: 500 }
      );
    }
    
    // SDK apiKeys.getAll() signature: getAll(projectId, options?)
    // Try with projectId only first (matches backend controller signature)
    // If that fails, try with options object (matches other routes)
    let apiKeys: unknown;
    try {
      // First try with projectId only
      apiKeys = await sdk.apiKeys.getAll(projectId);
    } catch (firstError) {
      const firstErrorMessage = firstError instanceof Error ? firstError.message : String(firstError);
      
      // If it's a "client mode" or "not available" error, the SDK method might not work via HTTP
      // In that case, we should return empty array (API keys are optional)
      if (firstErrorMessage.toLowerCase().includes("client mode") || 
          firstErrorMessage.toLowerCase().includes("not available") ||
          firstErrorMessage.toLowerCase().includes("server mode")) {
        console.log("[API Keys Route] SDK apiKeys.getAll not available in client mode, returning empty array");
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      
      // Try with options object as fallback
      try {
        apiKeys = await sdk.apiKeys.getAll(projectId, { limit, offset });
      } catch (secondError) {
        const secondErrorMessage = secondError instanceof Error ? secondError.message : String(secondError);
        console.error("[API Keys Route] SDK apiKeys.getAll error (both attempts failed):", secondErrorMessage, secondError);
        
        // Check if it's a "not found" or "project doesn't exist" error
        if (secondErrorMessage.toLowerCase().includes("not found") || 
            secondErrorMessage.toLowerCase().includes("does not exist") ||
            secondErrorMessage.toLowerCase().includes("project")) {
          // Return empty array for non-existent projects (not an error)
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
        
        throw secondError; // Re-throw other errors
      }
    }
    
    // SDK returns array directly (backend route returns { success: true, data: [...] })
    // Handle both direct array and wrapped response formats
    let apiKeysArray: unknown[] = [];
    if (Array.isArray(apiKeys)) {
      apiKeysArray = apiKeys;
    } else if (apiKeys && typeof apiKeys === "object" && "data" in apiKeys) {
      const response = apiKeys as { data: unknown };
      apiKeysArray = Array.isArray(response.data) ? response.data : [];
    } else if (apiKeys === null || apiKeys === undefined) {
      // SDK returned null/undefined, treat as empty array
      apiKeysArray = [];
    }
    
    return NextResponse.json({
      success: true,
      data: apiKeysArray,
    });
  } catch (error) {
    // Always convert error to string to prevent React rendering issues
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === "string" 
        ? error 
        : "Failed to get API keys";

    console.error("[API Keys Route] Error:", errorMessage, error);

    return NextResponse.json(
      {
        success: false,
        error: String(errorMessage),
      },
      { status: 500 }
    );
  }
}

/**
 * Create API key for a project
 * POST /api/krapi/k1/projects/[projectId]/api-keys
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
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

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, scopes, expires_at } = body;

    // SDK-FIRST: Use SDK apiKeys.create() method
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const apiKey = await sdk.apiKeys.create(projectId, {
      name: name || "Project API Key",
      scopes: scopes || ["projects:read", "collections:read"],
      expires_at,
    });

    return NextResponse.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create API key";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

