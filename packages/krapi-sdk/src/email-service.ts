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

/**
 * Email Service for BackendSDK
 * 
 * Provides email configuration management, template management,
 * and email sending functionality.
 * 
 * @class EmailService
 * @example
 * const emailService = new EmailService(dbConnection, logger);
 * await emailService.sendEmail({
 *   project_id: 'project-id',
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   body: 'World'
 * });
 */
export class EmailService {
  private db: DatabaseConnection;
  private logger: Logger;

  /**
   * Create a new EmailService instance
   * 
   * @param {DatabaseConnection} databaseConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  /**
   * Get email configuration for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<EmailConfig | null>} Email configuration or null if not found
   * @throws {Error} If query fails
   * 
   * @example
   * const config = await emailService.getConfig('project-id');
   */
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

  /**
   * Update email configuration for a project
   * 
   * @param {string} projectId - Project ID
   * @param {EmailConfig} config - Email configuration
   * @returns {Promise<EmailConfig | null>} Updated configuration or null if project not found
   * @throws {Error} If update fails
   * 
   * @example
   * const config = await emailService.updateConfig('project-id', {
   *   smtp_host: 'smtp.example.com',
   *   smtp_port: 587,
   *   smtp_secure: false,
   *   smtp_username: 'user',
   *   smtp_password: 'pass',
   *   from_email: 'noreply@example.com',
   *   from_name: 'KRAPI'
   * });
   */
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

  /**
   * Test email configuration
   * 
   * Tests the email configuration by attempting to create a test transporter.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<EmailResult>} Test result
   * @throws {Error} If configuration not found or test fails
   * 
   * @example
   * const result = await emailService.testConfig('project-id');
   * if (result.success) {
   *   console.log('Email configuration is valid');
   * }
   */
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

  /**
   * Get all email templates for a project
   *
   * Retrieves all email templates associated with a project.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<EmailTemplate[]>} Array of email templates
   * @throws {Error} If query fails
   *
   * @example
   * const templates = await emailService.getTemplates('project-id');
   */
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

  /**
   * Get email template by ID
   *
   * Retrieves a single email template by its ID.
   *
   * @param {string} templateId - Template ID
   * @returns {Promise<EmailTemplate | null>} Template or null if not found
   * @throws {Error} If query fails
   *
   * @example
   * const template = await emailService.getTemplate('template-id');
   */
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

  /**
   * Create a new email template
   *
   * Creates a new email template with subject, body, and variable definitions.
   *
   * @param {Omit<EmailTemplate, "id" | "created_at" | "updated_at">} templateData - Template data
   * @param {string} templateData.project_id - Project ID
   * @param {string} templateData.name - Template name
   * @param {string} templateData.subject - Email subject (supports variables)
   * @param {string} templateData.body - Email body HTML (supports variables)
   * @param {string[]} [templateData.variables] - Available template variables
   * @returns {Promise<EmailTemplate>} Created template
   * @throws {Error} If creation fails
   *
   * @example
   * const template = await emailService.createTemplate({
   *   project_id: 'project-id',
   *   name: 'welcome',
   *   subject: 'Welcome {{name}}!',
   *   body: '<h1>Welcome {{name}}</h1><p>Your account is ready.</p>',
   *   variables: ['name', 'email']
   * });
   */
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

  /**
   * Update an email template
   *
   * Updates email template subject, body, or variables.
   *
   * @param {string} templateId - Template ID
   * @param {Partial<EmailTemplate>} templateData - Template updates
   * @param {string} [templateData.name] - New template name
   * @param {string} [templateData.subject] - Updated subject
   * @param {string} [templateData.body] - Updated body
   * @param {string[]} [templateData.variables] - Updated variables
   * @returns {Promise<EmailTemplate | null>} Updated template or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * const updated = await emailService.updateTemplate('template-id', {
   *   subject: 'Updated Welcome {{name}}!',
   *   body: '<h1>Welcome {{name}}</h1>'
   * });
   */
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

  /**
   * Delete an email template
   *
   * Permanently deletes an email template.
   *
   * @param {string} templateId - Template ID
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If deletion fails
   *
   * @example
   * const deleted = await emailService.deleteTemplate('template-id');
   */
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

  /**
   * Send an email
   *
   * Sends an email using the project's email configuration.
   * Validates configuration and required fields before sending.
   *
   * @param {EmailRequest} emailData - Email data
   * @param {string} emailData.project_id - Project ID
   * @param {string | string[]} emailData.to - Recipient email(s)
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (HTML)
   * @param {string} [emailData.text] - Plain text version
   * @param {string | string[]} [emailData.cc] - CC recipients
   * @param {string | string[]} [emailData.bcc] - BCC recipients
   * @param {string} [emailData.replyTo] - Reply-to address
   * @param {Array} [emailData.attachments] - Email attachments
   * @returns {Promise<EmailResult>} Email sending result
   * @throws {Error} If sending fails or configuration missing
   *
   * @example
   * const result = await emailService.sendEmail({
   *   project_id: 'project-id',
   *   to: 'user@example.com',
   *   subject: 'Hello',
   *   body: '<h1>Hello World</h1>'
   * });
   */
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

  /**
   * Send email (convenience method)
   *
   * Alias for sendEmail. Sends an email with project context.
   *
   * @param {EmailRequest} emailWithProject - Email request with project_id
   * @returns {Promise<EmailResult>} Email sending result
   * @throws {Error} If sending fails
   *
   * @example
   * const result = await emailService.sendEmailRequest({
   *   project_id: 'project-id',
   *   to: 'user@example.com',
   *   subject: 'Hello',
   *   body: 'World'
   * });
   */
  async sendEmailRequest(emailWithProject: EmailRequest): Promise<EmailResult> {
    return this.sendEmail(emailWithProject);
  }
}
