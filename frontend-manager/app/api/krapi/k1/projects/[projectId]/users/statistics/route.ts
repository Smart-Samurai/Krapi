/**
 * Get User Statistics API Route
 * GET /api/krapi/k1/projects/[projectId]/users/statistics
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

/* eslint-disable no-console */
import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

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

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK users.getStatistics() method (matches SDK adapter)
    // Note: SDK method may return ApiResponse format or direct data
    let statistics: unknown;
    try {
      const result = await backendSdk.users.getStatistics(projectId);
      
      // Handle ApiResponse format: { success: boolean, data: {...} }
      if (result && typeof result === 'object' && 'data' in result) {
        const apiResponse = result as unknown as { success: boolean; data: unknown; error?: string };
        if (apiResponse.success && apiResponse.data) {
          statistics = apiResponse.data;
        } else {
          throw new Error(apiResponse.error || "Failed to get user statistics");
        }
      } else {
        // Direct format - SDK adapter already unwrapped
        statistics = result;
      }
    } catch (error) {
      // If SDK method doesn't exist or fails, provide clearer error
      const errorMessage = error instanceof Error ? error.message : "Failed to get user statistics";
      if (errorMessage.includes("not found") || errorMessage.includes("User not found")) {
        // This suggests SDK might be calling wrong endpoint
        console.error("[USER STATISTICS] SDK error:", errorMessage);
        console.error("[USER STATISTICS] This might indicate SDK is calling wrong endpoint or method doesn't exist");
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: statistics,
    } as { success: boolean; data: unknown });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user statistics",
      },
      { status: 500 }
    );
  }
}



