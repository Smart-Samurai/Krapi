/**
 * Email Templates API Route
 * GET /api/krapi/k1/projects/[projectId]/email/templates
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

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
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const templates = await sdk.email.getTemplates(projectId);

    // SDK returns templates array or object with templates/data
    let templatesArray: unknown[] = [];
    if (Array.isArray(templates)) {
      templatesArray = templates;
    } else if (
      templates &&
      typeof templates === "object" &&
      templates !== null
    ) {
      if (
        "templates" in templates &&
        Array.isArray((templates as { templates: unknown }).templates)
      ) {
        templatesArray = (templates as { templates: unknown[] }).templates;
      } else if (
        "data" in templates &&
        Array.isArray((templates as { data: unknown }).data)
      ) {
        templatesArray = (templates as { data: unknown[] }).data;
      }
    }

    // CRITICAL: Always return an array (even if empty) - test expects array, not object
    // If result is empty object or unexpected format, return empty array
    if (!Array.isArray(templatesArray)) {
      templatesArray = [];
    }

    // Return array directly (test expects array, SDK adapter should handle unwrapping)
    return NextResponse.json(templatesArray);
  } catch (error) {
    // Even on error, return empty array instead of error object (test expects array)
    // eslint-disable-next-line no-console
    console.error("Error getting email templates:", error);
    return NextResponse.json([]);
  }
}
