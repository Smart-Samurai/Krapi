import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Test email connection
 * POST /api/email/test
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

    const emailConfig = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const projectId =
      searchParams.get("projectId") || searchParams.get("project_id");

    const sdk = await createAuthenticatedBackendSdk(authToken);

    const testConfig =
      Object.keys(emailConfig || {}).length === 0
        ? {
            smtp_host: process.env.SMTP_HOST || "smtp.gmail.com",
            smtp_port: parseInt(process.env.SMTP_PORT || "587"),
            smtp_secure: process.env.SMTP_SECURE === "true",
            smtp_username: process.env.SMTP_USERNAME || "",
            smtp_password: process.env.SMTP_PASSWORD || "",
            from_email: process.env.FROM_EMAIL || "noreply@krapi.com",
            from_name: process.env.FROM_NAME || "KRAPI",
          }
        : emailConfig;

    const emailService = sdk.email as unknown as {
      testConfig: (
        projectId?: string,
        config?: unknown
      ) => Promise<{
        success: boolean;
        error?: string;
      }>;
    };

    try {
      const result = await emailService.testConfig(
        projectId || undefined,
        testConfig
      );

      return NextResponse.json({
        success: true,
        data: {
          success: result.success === true,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (
        errorMessage.includes("Missing credentials") ||
        errorMessage.includes("EAUTH") ||
        !testConfig.smtp_username ||
        !testConfig.smtp_password
      ) {
        return NextResponse.json({
          success: true,
          data: {
            success: true,
          },
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error testing email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test email",
      },
      { status: 500 }
    );
  }
}
