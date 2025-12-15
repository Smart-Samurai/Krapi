import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for creating an email template
 * POST /:projectId/email/templates
 */
export class CreateEmailTemplateHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { projectId } = req.params;
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

      const result = await this.backendSDK.email.createTemplate(templateWithProject);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create email template",
      });
    }
  }
}








