// import { Request, Response } from "express";

// import { backendSDK } from "@/lib/backend-sdk";
// import { ApiResponse } from "@/types";

/**
 * Email Controller
 * 
 * Handles email-related operations including:
 * - Email configuration management
 * - Email template management
 * - Email sending
 * 
 * **STATUS: TEMPORARILY DISABLED**
 * 
 * This controller is currently commented out and will be reimplemented using direct services.
 * All email functionality is currently handled through the email routes using SDK services.
 * 
 * @module controllers/email.controller
 * @deprecated This controller is disabled - use email routes with SDK services instead
 */
/*
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
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      const templates = await backendSDK.email.getTemplates(projectId);

      res.status(200).json({
        success: true,
        data: templates,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting email templates:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email templates",
      } as ApiResponse);
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
        } as ApiResponse);
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.getTemplate(templateId);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email template",
      } as ApiResponse);
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
        } as ApiResponse);
        return;
      }

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.createTemplate(templateData);

      res.status(201).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create email template",
      } as ApiResponse);
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
        } as ApiResponse);
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        } as ApiResponse);
        return;
      }

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.updateTemplate(
        templateId,
        templateData
      );

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email template",
      } as ApiResponse);
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
        } as ApiResponse);
        return;
      }

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "Template ID is required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.deleteTemplate(templateId);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete email template",
      } as ApiResponse);
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
        } as ApiResponse);
        return;
      }

      if (!emailData.to || !emailData.subject || !emailData.body) {
        res.status(400).json({
          success: false,
          error: "To, subject, and body are required",
        } as ApiResponse);
        return;
      }

      const result = await backendSDK.email.sendEmail(emailData);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send email",
      } as ApiResponse);
    }
  };
}
*/

export default {}; // Temporary empty export
