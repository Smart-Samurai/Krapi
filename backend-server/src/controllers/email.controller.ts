import { Request, Response } from "express";
import { backendSDK } from "@/lib/backend-sdk";
import { ApiResponse } from "@/types";

export class EmailController {
  // Get email configuration
  getEmailConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      console.log("Email config request - projectId:", projectId);
      console.log("Request params:", req.params);
      console.log("Request headers:", req.headers);

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      const config = await backendSDK.email.getConfig(projectId);

      res.status(200).json({
        success: true,
        data: config,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email configuration",
      } as ApiResponse);
    }
  };

  // Update email configuration
  updateEmailConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const configData = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      const config = await backendSDK.email.updateConfig(projectId, configData);

      res.status(200).json({
        success: true,
        data: config,
      } as ApiResponse);
    } catch (error) {
      console.error("Error updating email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email configuration",
      } as ApiResponse);
    }
  };

  // Test email configuration
  testEmailConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { email } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.testConfig(projectId);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error testing email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test email configuration",
      } as ApiResponse);
    }
  };

  // Get email templates
  getEmailTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      console.log("Email templates request - projectId:", projectId);
      console.log("Request params:", req.params);

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const templates = await backendSDK.email.getTemplates(projectId);

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error("Error getting email templates:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email templates",
      });
    }
  };

  // Get a specific email template
  getEmailTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, templateId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
        return;
      }

      const result = await backendSDK.email.getTemplate(templateId);

      if (result) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Email template not found",
        });
      }
    } catch (error) {
      console.error("Error getting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email template",
      });
    }
  };

  // Create email template
  createEmailTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const templateData = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const result = await backendSDK.email.createTemplate(templateData);

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
  };

  // Update email template
  updateEmailTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, templateId } = req.params;
      const templateData = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
        return;
      }

      const result = await backendSDK.email.updateTemplate(
        templateId,
        templateData
      );

      if (result) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Email template not found",
        });
      }
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email template",
      });
    }
  };

  // Delete email template
  deleteEmailTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, templateId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
        return;
      }

      const deleted = await backendSDK.email.deleteTemplate(templateId);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: "Email template deleted successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Email template not found or could not be deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete email template",
      });
    }
  };

  // Send email
  sendEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const emailData = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const result = await backendSDK.email.sendEmail(emailData);

      if (result) {
        res.status(200).json({
          success: true,
          message: "Email sent successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send email",
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send email",
      });
    }
  };
}
