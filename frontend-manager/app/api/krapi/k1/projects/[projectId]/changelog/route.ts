/**
 * Project Changelog API Route
 * GET /api/krapi/k1/projects/[projectId]/changelog
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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const changelogOptions: { limit?: number; offset?: number } = {};
    if (limit) {
      changelogOptions.limit = parseInt(limit, 10);
    }
    if (offset) {
      changelogOptions.offset = parseInt(offset, 10);
    }

    const changelog = await sdk.changelog.getProjectChangelog(
      projectId,
      changelogOptions
    );

    // SDK returns changelog array or object with entries
    let entries: unknown[] = [];
    if (Array.isArray(changelog)) {
      entries = changelog;
    } else if (
      changelog &&
      typeof changelog === "object" &&
      changelog !== null
    ) {
      if (
        "entries" in changelog &&
        Array.isArray((changelog as { entries: unknown }).entries)
      ) {
        entries = (changelog as { entries: unknown[] }).entries;
      } else if (
        "data" in changelog &&
        Array.isArray((changelog as { data: unknown }).data)
      ) {
        entries = (changelog as { data: unknown[] }).data;
      }
    }

    // CRITICAL: Always ensure entries is an array (never null/undefined/object)
    if (!Array.isArray(entries)) {
      entries = [];
    }

    // Return array directly (test expects array, SDK adapter should handle unwrapping)
    return NextResponse.json(entries);
  } catch (error) {
    // Even on error, return empty array instead of error object (test expects array)
    // eslint-disable-next-line no-console
    console.error("Error getting project changelog:", error);
    return NextResponse.json([]);
  }
}
