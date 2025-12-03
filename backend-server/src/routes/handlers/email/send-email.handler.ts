import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for sending an email
 * POST /:projectId/email/send
 *
 * SDK 0.4.0+: Uses EmailService.sendEmail() method
 */
export class SendEmailHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const { to, subject, body, templateId, templateData } = req.body;

      if (!to) {
        res.status(400).json({
          success: false,
          error: "Recipient email address is required",
        });
        return;
      }

      // Build email request
      let emailSubject = subject;
      let emailBody = body;

      // If template is provided, fetch and merge
      if (templateId) {
        try {
          const template = await this.backendSDK.email.getTemplate(templateId);
          if (template) {
            emailSubject = template.subject;
            emailBody = template.body;

            // Replace template variables with templateData
            if (templateData && typeof templateData === "object") {
              for (const [key, value] of Object.entries(templateData)) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
                emailSubject = emailSubject.replace(regex, String(value));
                emailBody = emailBody.replace(regex, String(value));
              }
            }
          }
        } catch {
          res.status(404).json({
            success: false,
            error: "Template not found",
          });
          return;
        }
      }

      // Validate that we have subject and body
      if (!emailSubject || !emailBody) {
        res.status(400).json({
          success: false,
          error:
            "Subject and body are required (either directly or via template)",
        });
        return;
      }

      // Send email using SDK email adapter service
      // EmailAdapterService uses sendEmail() method with EmailSendRequest
      const emailAdapter = this.backendSDK.email as unknown as {
        sendEmail: (request: { project_id: string; to: string; subject: string; body: string }) => Promise<unknown>;
      };
      const result = await emailAdapter.sendEmail({
        project_id: projectId,
        to,
        subject: emailSubject,
        body: emailBody,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send email";
      
      // Provide clearer error messages for common issues
      if (errorMessage.includes("not configured") || 
          errorMessage.includes("SMTP") || 
          errorMessage.includes("smtp") ||
          errorMessage.includes("configuration")) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
      } else {
        res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    }
  }
}
