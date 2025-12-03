import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting a specific email template
 * GET /:projectId/email/templates/:templateId
 */
export class GetEmailTemplateHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
        return;
      }
      const result = await this.backendSDK.email.getTemplate(templateId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "Email template not found",
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error getting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email template",
      });
    }
  }
}








