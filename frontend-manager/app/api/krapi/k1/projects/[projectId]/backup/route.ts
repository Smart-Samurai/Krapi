/**
 * Project Backup API Route
 * POST /api/krapi/k1/projects/[projectId]/backup
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(
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

    const body = await request.json();
    const { description, password } = body;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const backupOptions: {
      description?: string;
      password?: string;
    } = {};
    if (description !== undefined) {
      backupOptions.description = description;
    }
    if (password !== undefined) {
      backupOptions.password = password;
    }

    // SDK client adapter uses createProject(projectId, options) signature
    const backup = await sdk.backup.createProject(projectId, backupOptions);

    // SDK returns BackupMetadata object - must include ALL fields that tests expect
    // Test expects: id, snapshot_id, type, created_at, size, unique_size, file_count
    return NextResponse.json({
      success: true,
      data: {
        id: backup.id,
        backup_id: backup.id,
        snapshot_id: backup.snapshot_id || backup.id,
        password: password || "",
        created_at: backup.created_at,
        size: backup.size || 0,
        unique_size: backup.unique_size !== undefined && backup.unique_size !== null ? backup.unique_size : (backup.size || 0),
        file_count: backup.file_count !== undefined && backup.file_count !== null ? backup.file_count : 0,
        description: backup.description,
        type: backup.type || 'project',
        project_id: backup.project_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create project backup",
      },
      { status: 500 }
    );
  }
}
