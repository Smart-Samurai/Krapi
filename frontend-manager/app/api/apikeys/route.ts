import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * List API keys
 * GET /api/apikeys
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const keys = await sdk.apiKeys.getAll("");

    return NextResponse.json({
      success: true,
      keys: Array.isArray(keys) ? keys : [keys],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list API keys",
      },
      { status: 500 }
    );
  }
}

/**
 * Create API key
 * POST /api/apikeys
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

    const keyData = await request.json();

    const projectId = keyData.projectId || keyData.project_id;
    
    // If no projectId provided, create admin API key using SDK
    if (!projectId) {
      const sdk = await createAuthenticatedBackendSdk(authToken);
      
      // Get current user ID from SDK
      const currentUserResult = await sdk.auth.getCurrentUser();
      
      if (!currentUserResult.success || !currentUserResult.data) {
        throw new Error("User context required for admin API key creation");
      }

      const userId = currentUserResult.data.id;
      if (!userId) {
        throw new Error("User ID required for admin API key creation");
      }

      // Use SDK admin.createApiKey() method for admin API keys
      // Note: TypeScript may not recognize this method, but it exists at runtime in BackendSDK
      const result = await (sdk.admin as { createApiKey?: (userId: string, data: { name: string; permissions: string[]; expires_at?: string }) => Promise<{ key: string; data: unknown }> }).createApiKey?.(userId, {
        name: keyData.name,
        permissions: keyData.scopes || [],
        expires_at: keyData.expires_at,
      });

      if (!result) {
        throw new Error("Admin API key creation method not available");
      }

      return NextResponse.json({ 
        success: true, 
        key: result.key,
        data: result.data,
      }, { status: 201 });
    }

    // If projectId is provided, use SDK
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const key = await sdk.apiKeys.create(projectId, {
      name: keyData.name,
      scopes: keyData.scopes,
      expires_at: keyData.expires_at,
      rate_limit: keyData.rate_limit,
      metadata: keyData.description
        ? { description: keyData.description }
        : undefined,
    });

    return NextResponse.json({ success: true, key }, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating API key:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create API key",
      },
      { status: 500 }
    );
  }
}
