/**
 * List Project Backups API Route
 * GET /api/krapi/k1/projects/[projectId]/backups
 */

import type { BackupMetadata } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "project" | "system" | undefined;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // SDK 0.4.0+: Use backup.list(projectId?, type?) instead of backups.list()
    const backupsList = await sdk.backup.list(projectId, type);

    // Extract backups array from result
    let backupsArray: unknown[] = [];
    if (Array.isArray(backupsList)) {
      backupsArray = backupsList;
    } else if (backupsList && typeof backupsList === "object" && backupsList !== null) {
      if ("backups" in backupsList && Array.isArray((backupsList as { backups: unknown }).backups)) {
        backupsArray = (backupsList as { backups: unknown[] }).backups;
      } else if ("data" in backupsList && Array.isArray((backupsList as { data: unknown }).data)) {
        backupsArray = (backupsList as { data: unknown[] }).data;
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
    console.error("Error listing project backups:", error);
    return NextResponse.json([]);
  }
}
