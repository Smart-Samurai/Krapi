import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for deleting an email template
 * DELETE /:projectId/email/templates/:templateId
 */
export class DeleteEmailTemplateHandler {
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

      await this.backendSDK.email.deleteTemplate(templateId);

      res.json({
        success: true,
        message: "Email template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete email template",
      });
    }
  }
}








