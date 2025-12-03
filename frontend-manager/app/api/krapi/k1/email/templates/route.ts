/**
 * Email Templates API Route
 * GET /api/krapi/k1/email/templates
 * POST /api/krapi/k1/email/templates
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const projectId =
      searchParams.get("project_id") || searchParams.get("projectId") || "";

    // SDK 0.4.0+: Use email.getTemplates() instead of email.templates.list()
    const templates = await sdk.email.getTemplates(projectId, {
      limit,
      offset,
    });

    return NextResponse.json(templates);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting email templates:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get email templates",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const projectId = body.projectId || body.project_id;
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // SDK 0.4.0+: Use email.createTemplate() instead of email.templates.create()
    const template = await sdk.email.createTemplate(projectId, body);

    return NextResponse.json(template);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating email template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create email template",
      },
      { status: 500 }
    );
  }
}
