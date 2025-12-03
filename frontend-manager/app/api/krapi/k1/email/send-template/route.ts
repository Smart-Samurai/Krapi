/**
 * Send Email from Template API Route
 * POST /api/krapi/k1/email/send-template
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
    const templateId = body.templateId || body.template_id;
    if (!projectId || !templateId) {
      return NextResponse.json(
        { error: "projectId and templateId are required" },
        { status: 400 }
      );
    }

    // SDK 0.4.0+: No sendTemplate method - get template first, then send
    // Get template content
    const template = await sdk.email.getTemplate(projectId, templateId);

    // Replace template variables with data
    let subject = template.subject;
    let bodyContent = template.body;

    if (body.variables && typeof body.variables === "object") {
      for (const [key, value] of Object.entries(body.variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
        subject = subject.replace(regex, String(value));
        bodyContent = bodyContent.replace(regex, String(value));
      }
    }

    // Send using the template content
    // SDK 0.5.0: SendEmailRequest simplified to to, subject, body
    const result = await sdk.email.send(projectId, {
      to: body.to,
      subject,
      body: bodyContent,
    });

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error sending email from template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send email from template",
      },
      { status: 500 }
    );
  }
}
