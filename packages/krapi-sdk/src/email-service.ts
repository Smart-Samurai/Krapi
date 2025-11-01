/**
 * Email Service for BackendSDK
 *
 * Provides email configuration management, template management,
 * and email sending functionality.
 */

import nodemailer from "nodemailer";

import { DatabaseConnection, Logger } from "./core";

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

export interface EmailTemplate {
  id: string;
  project_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailRequest {
  project_id: string;
  to: string | string[];
  subject: string;
  body: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename?: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

export interface EmailHistory {
  id: string;
  project_id: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sent_at?: string;
  error_message?: string;
  template_id?: string;
  created_at: string;
}

export interface EmailProvider {
  id: string;
  name: string;
  type: "smtp" | "sendgrid" | "mailgun" | "aws_ses";
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class EmailService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // Email Configuration Management
  async getConfig(projectId: string): Promise<EmailConfig | null> {
    try {
      const result = await this.db.query(
        `SELECT settings->>'email_config' as email_config
         FROM projects 
         WHERE id = $1`,
        [projectId]
      );

      const row = result.rows[0] as { email_config?: string };
      if (result.rows.length === 0 || !row.email_config) {
        return null;
      }

      return JSON.parse(row.email_config);
    } catch (error) {
      this.logger.error("Failed to get email config:", error);
      throw new Error("Failed to get email config");
    }
  }

  async updateConfig(
    projectId: string,
    config: EmailConfig
  ): Promise<EmailConfig | null> {
    try {
      const result = await this.db.query(
        `UPDATE projects 
         SET settings = jsonb_set(
           COALESCE(settings, '{}'::jsonb), 
           '{email_config}', 
           $2::jsonb
         ), updated_at = NOW()
         WHERE id = $1
         RETURNING settings->>'email_config' as email_config`,
        [projectId, JSON.stringify(config)]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return JSON.parse(
        (result.rows[0] as { email_config: string }).email_config
      );
    } catch (error) {
      this.logger.error("Failed to update email config:", error);
      throw new Error("Failed to update email config");
    }
  }

  async testConfig(projectId: string): Promise<EmailResult> {
    try {
      const config = await this.getConfig(projectId);
      if (!config) {
        return {
          success: false,
          message: "Email configuration not found for this project",
        };
      }

      // Test the email configuration by creating a test transporter
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
          user: config.smtp_username,
          pass: config.smtp_password,
        },
      });

      // Verify the connection
      await transporter.verify();

      return {
        success: true,
        message: "Email configuration is valid and connection verified",
      };
    } catch (error) {
      this.logger.error("Email config test failed:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to test email configuration",
      };
    }
  }

  // Email Template Management
  async getTemplates(projectId: string): Promise<EmailTemplate[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM email_templates 
         WHERE project_id = $1
         ORDER BY created_at DESC`,
        [projectId]
      );
      return result.rows as EmailTemplate[];
    } catch (error) {
      this.logger.error("Failed to get email templates:", error);
      throw new Error("Failed to get email templates");
    }
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM email_templates 
         WHERE id = $1`,
        [templateId]
      );
      return result.rows.length > 0 ? (result.rows[0] as EmailTemplate) : null;
    } catch (error) {
      this.logger.error("Failed to get email template:", error);
      throw new Error("Failed to get email template");
    }
  }

  async createTemplate(
    templateData: Omit<EmailTemplate, "id" | "created_at" | "updated_at">
  ): Promise<EmailTemplate> {
    try {
      const { name, subject, body, variables, project_id } = templateData;
      const result = await this.db.query(
        `INSERT INTO email_templates (project_id, name, subject, body, variables, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [project_id, name, subject, body, JSON.stringify(variables || [])]
      );
      return result.rows[0] as EmailTemplate;
    } catch (error) {
      this.logger.error("Failed to create email template:", error);
      throw new Error("Failed to create email template");
    }
  }

  async updateTemplate(
    templateId: string,
    templateData: Partial<EmailTemplate>
  ): Promise<EmailTemplate | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (templateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(templateData.name);
      }
      if (templateData.subject !== undefined) {
        fields.push(`subject = $${paramCount++}`);
        values.push(templateData.subject);
      }
      if (templateData.body !== undefined) {
        fields.push(`body = $${paramCount++}`);
        values.push(templateData.body);
      }
      if (templateData.variables !== undefined) {
        fields.push(`variables = $${paramCount++}`);
        values.push(JSON.stringify(templateData.variables));
      }

      if (fields.length === 0) {
        return this.getTemplate(templateId);
      }

      fields.push(`updated_at = NOW()`);
      values.push(templateId);

      const result = await this.db.query(
        `UPDATE email_templates 
         SET ${fields.join(", ")} 
         WHERE id = $${paramCount} 
         RETURNING *`,
        values
      );

      return result.rows.length > 0 ? (result.rows[0] as EmailTemplate) : null;
    } catch (error) {
      this.logger.error("Failed to update email template:", error);
      throw new Error("Failed to update email template");
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM email_templates 
         WHERE id = $1`,
        [templateId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete email template:", error);
      throw new Error("Failed to delete email template");
    }
  }

  // Email Sending
  async sendEmail(emailData: EmailRequest): Promise<EmailResult> {
    try {
      // Get the project to check if email is configured
      const projectResult = await this.db.query(
        "SELECT id FROM projects WHERE id = $1",
        [emailData.project_id]
      );

      if (projectResult.rows.length === 0) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Check if email configuration exists
      const emailConfig = await this.getConfig(emailData.project_id);
      if (!emailConfig) {
        return {
          success: false,
          message: "Email configuration not found for this project",
        };
      }

      // Validate required email data
      const { to, subject, body } = emailData;
      if (!to || !subject || !body) {
        return {
          success: false,
          message: "To, subject, and body are required for sending emails",
        };
      }

      // Create transporter and send email
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_secure,
        auth: {
          user: emailConfig.smtp_username,
          pass: emailConfig.smtp_password,
        },
      });

      const result = await transporter.sendMail({
        from: `"${emailConfig.from_name}" <${emailConfig.from_email}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html: body,
        text: emailData.text || body,
        cc: emailData.cc,
        bcc: emailData.bcc,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments,
      });

      return {
        success: true,
        message: `Email sent successfully. Message ID: ${
          result.messageId || "unknown"
        }`,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error("Send email error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send email",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Convenience method for sending emails with project context
  async sendEmailRequest(emailWithProject: EmailRequest): Promise<EmailResult> {
    return this.sendEmail(emailWithProject);
  }
}
