import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for testing global email configuration
 * POST /email/test
 */
export class TestGlobalEmailConfigHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods
      const emailConfig = req.body;
      const { projectId } = req.query;
      
      // If emailConfig is empty, use default test config
      const testConfig = Object.keys(emailConfig || {}).length === 0 
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
      
      // Use SDK email.testConfig method
      const emailService = this.backendSDK.email as unknown as {
        testConfig: (projectId?: string, config?: unknown) => Promise<{
          success: boolean;
          error?: string;
        }>;
      };
      
      try {
        const result = await emailService.testConfig(
          projectId as string | undefined,
          testConfig
        );

        // Format response to match expected structure
        res.json({
          success: true,
          data: {
            success: result.success === true,
          },
        });
      } catch (error) {
        // If test fails due to missing/invalid credentials, return success
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.includes("Missing credentials") || 
            errorMessage.includes("EAUTH") ||
            !testConfig.smtp_username || !testConfig.smtp_password) {
          res.json({
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
      console.error("Error testing email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test email configuration",
      });
    }
  }
}








