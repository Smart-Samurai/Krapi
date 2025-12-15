/**
 * Bulk Email Send API Route
 * POST /api/krapi/k1/email/bulk-send
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

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

    // SDK 0.4.0+: No bulkSend method - use email.send() for each recipient
    // If body.recipients is provided, send to each recipient
    // Otherwise, fall back to using body directly as a single email
    if (body.recipients && Array.isArray(body.recipients)) {
      const results = await Promise.allSettled(
        body.recipients.map((recipient: string) =>
          sdk.email.send(projectId, { ...body, to: recipient })
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return NextResponse.json({
        success: failed === 0,
        total: results.length,
        successful,
        failed,
      });
    } else {
      const result = await sdk.email.send(projectId, body);
      return NextResponse.json(result);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error sending bulk email:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send bulk email",
      },
      { status: 500 }
    );
  }
}
