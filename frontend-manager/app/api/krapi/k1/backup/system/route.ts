/**
 * Create System Backup API Route
 * POST /api/krapi/k1/backup/system
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

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
    const { description, password } = body;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // SDK 0.4.0+: Use backup.createSystem() instead of backups.createSystemBackup()
    // SDK HTTP client may return ApiResponse or direct format
    let backupResult: unknown;
    try {
      backupResult = await backendSdk.backup.createSystem({
        description,
        password,
      });
    } catch (sdkError) {
      // eslint-disable-next-line no-console
      console.error("SDK backup.createSystem error:", sdkError);
      const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
      return NextResponse.json(
        {
          success: false,
          error: `Backup creation failed: ${errorMessage}`,
          details: "The Restic backup operation failed. Check backend logs for details.",
        },
        { status: 500 }
      );
    }

    // Backend returns: { success: true, data: { id: ..., snapshot_id: ..., unique_size: ..., file_count: ... }, backup_id: ..., password: ... }
    // SDK HTTP client should unwrap ApiResponse, but handle both cases
    let backup: Record<string, unknown>;
    if (backupResult && typeof backupResult === 'object' && 'data' in backupResult) {
      // ApiResponse format - extract data field
      const data = (backupResult as { data: unknown }).data;
      if (data && typeof data === 'object') {
        backup = data as Record<string, unknown>;
      } else {
        backup = (backupResult as unknown) as Record<string, unknown>;
      }
    } else if (backupResult && typeof backupResult === 'object') {
      // Direct format - SDK adapter already unwrapped
      backup = (backupResult as unknown) as Record<string, unknown>;
    } else {
      // Fallback - should not happen
      backup = { id: 'unknown' };
    }

    // Ensure snapshot_id is always present (use id as fallback if not provided)
    if (!backup.snapshot_id && backup.id) {
      backup.snapshot_id = backup.id;
    }

    // Check for error in response
    if ((backupResult as { success?: boolean; error?: string }).success === false) {
      const errorMsg = (backupResult as { error?: string }).error || "Backup creation failed";
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          details: "The backup operation returned an error. Check backend logs for details.",
        },
        { status: 500 }
      );
    }

    // Ensure id is at top level (test expects backup.id)
    // Check both 'id' and 'backup_id' fields
    if (!backup.id) {
      if ((backup as { backup_id?: unknown }).backup_id) {
        backup.id = (backup as { backup_id?: unknown }).backup_id;
      } else {
        const resultAsAny = (backupResult as unknown) as { backup_id?: unknown };
        if (resultAsAny?.backup_id) {
          backup.id = resultAsAny.backup_id;
        }
      }
    }

    // Validate backup has required fields - if not, return error response
    if (!backup.id || backup.id === 'unknown' || (typeof backup.id === 'string' && backup.id.trim() === '')) {
      // eslint-disable-next-line no-console
      console.error("Backup creation returned invalid response:", backupResult);
      return NextResponse.json(
        {
          success: false,
          error: "Backup creation failed - no backup ID returned",
          details: "The backup operation may have failed. Check backend logs for details.",
        },
        { status: 500 }
      );
    }

    // Return backup object directly with id at top level (test expects backup.id)
    // Include all Restic fields: id, snapshot_id, unique_size, file_count, etc.
    return NextResponse.json(backup);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating system backup:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create system backup";
    const statusCode = (error as { status?: number })?.status || 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
