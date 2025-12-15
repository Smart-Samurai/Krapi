import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for updating an email template
 * PUT /:projectId/email/templates/:templateId
 */
export class UpdateEmailTemplateHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { projectId, templateId } = req.params;
      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
        return;
      }
      const templateData = req.body;

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        });
        return;
      }

      // Add project ID to template data
      const templateWithProject = {
        ...templateData,
        projectId,
      };

      const result = await this.backendSDK.email.updateTemplate(
        templateId,
        templateWithProject
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email template",
      });
    }
  }
}








