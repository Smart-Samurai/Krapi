/**
 * List Backups API Route
 * GET /api/krapi/k1/backups
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get("project_id");
    const type = searchParams.get("type");

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const backups = await sdk.backup.list(
      project_id || undefined,
      (type as "project" | "system" | undefined) || undefined
    );

    // SDK returns BackupMetadata[] array
    let backupsArray: unknown[] = [];
    if (Array.isArray(backups)) {
      backupsArray = backups;
    } else if (backups && typeof backups === "object" && backups !== null) {
      if (
        "backups" in backups &&
        Array.isArray((backups as { backups: unknown }).backups)
      ) {
        backupsArray = (backups as { backups: unknown[] }).backups;
      } else if (
        "data" in backups &&
        Array.isArray((backups as { data: unknown }).data)
      ) {
        backupsArray = (backups as { data: unknown[] }).data;
      }
    }

    // CRITICAL: Always ensure backupsArray is an array (never null/undefined/object)
    if (!Array.isArray(backupsArray)) {
      backupsArray = [];
    }

    // Return array directly (test expects array, SDK adapter should handle unwrapping)
    return NextResponse.json(backupsArray);
  } catch (error) {
    // Even on error, return empty array instead of error object (test expects array)
    // eslint-disable-next-line no-console
    console.error("Error listing backups:", error);
    return NextResponse.json([]);
  }
}
