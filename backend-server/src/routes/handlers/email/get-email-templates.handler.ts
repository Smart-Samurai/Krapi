import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting all email templates
 * GET /:projectId/email/templates
 */
export class GetEmailTemplatesHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
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
      const templates = await this.backendSDK.email.getTemplates(projectId);

      // Ensure templates is always an array (even if empty)
      const templatesArray = Array.isArray(templates) ? templates : [];

      res.json({
        success: true,
        data: templatesArray,
      });
    } catch (error) {
      console.error("Error getting email templates:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email templates",
      });
    }
  }
}








