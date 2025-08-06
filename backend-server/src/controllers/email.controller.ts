import { Request, Response } from "express";
import { DatabaseService } from "@/services/database.service";

export class EmailController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

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
        });
        return;
      }

      const config = await this.db.getEmailConfig(projectId);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email configuration",
      });
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
        });
        return;
      }

      const updated = await this.db.updateEmailConfig(projectId, configData);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error updating email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email configuration",
      });
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
        });
        return;
      }

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        });
        return;
      }

      const result = await this.db.testEmailConfig(projectId, email);

      res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error("Error testing email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send test email",
      });
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

      const templates = await this.db.getEmailTemplates(projectId);

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

      const template = await this.db.getEmailTemplate(projectId, templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: "Email template not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: template,
      });
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

      const template = await this.db.createEmailTemplate(
        projectId,
        templateData
      );

      res.status(201).json({
        success: true,
        data: template,
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

      const template = await this.db.updateEmailTemplate(
        projectId,
        templateId,
        templateData
      );

      res.status(200).json({
        success: true,
        data: template,
      });
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

      await this.db.deleteEmailTemplate(projectId, templateId);

      res.status(200).json({
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

      const result = await this.db.sendEmail(projectId, emailData);

      res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send email",
      });
    }
  };
}
