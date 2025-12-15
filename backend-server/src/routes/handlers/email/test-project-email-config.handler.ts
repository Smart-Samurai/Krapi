import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for testing project email configuration
 * POST /:projectId/email/test
 */
export class TestProjectEmailConfigHandler {
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
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        });
        return;
      }

      const result = await this.backendSDK.email.testConfig(projectId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error testing email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test email configuration",
      });
    }
  }
}








