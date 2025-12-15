import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";

import { ProjectService } from "./project.service";

/**
 * Email Config Service
 * 
 * Handles email configuration and templates.
 * Email config is stored in project settings (main DB).
 * Email templates are stored in main DB.
 */
export class EmailConfigService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private projectService: ProjectService
  ) {}

  /**
   * Get email configuration for a project
   */
  async getEmailConfig(
    projectId: string
  ): Promise<Record<string, unknown> | null> {
    await this.core.ensureReady();
    
    // Project metadata is in main DB
    const result = await this.dbManager.queryMain(
      "SELECT settings FROM projects WHERE id = $1",
      [projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }
    const settings =
      typeof row.settings === "string"
        ? JSON.parse(row.settings as string)
        : row.settings;

    return (settings as Record<string, unknown>)?.email_config as Record<
      string,
      unknown
    > | null;
  }

  /**
   * Update email configuration
   */
  async updateEmailConfig(
    projectId: string,
    config: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    await this.core.ensureReady();
    
    // Get existing settings first
    const existingResult = await this.dbManager.queryMain(
      "SELECT settings FROM projects WHERE id = $1",
      [projectId]
    );

    if (existingResult.rows.length === 0) {
      return null;
    }

    const existingRow = existingResult.rows[0];
    if (!existingRow) {
      return null;
    }
    const existingSettings =
      typeof existingRow.settings === "string"
        ? JSON.parse(existingRow.settings as string)
        : existingRow.settings || {};

    // Update email config in settings
    const updatedSettings = {
      ...(existingSettings as Record<string, unknown>),
      email_config: config,
    };

    // Update in main DB
    await this.dbManager.queryMain(
      "UPDATE projects SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [JSON.stringify(updatedSettings), projectId]
    );

    return config;
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(
    projectId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.core.ensureReady();

      // Get the project to check if email is configured
      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Check if email configuration exists
      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        return {
          success: false,
          message: "Email configuration not found for this project",
        };
      }

      // Test the email configuration by creating a test transporter
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: (emailConfig as { smtp_host?: string }).smtp_host,
        port: (emailConfig as { smtp_port?: number }).smtp_port,
        secure: (emailConfig as { smtp_secure?: boolean }).smtp_secure,
        auth: {
          user: (emailConfig as { smtp_username?: string }).smtp_username,
          pass: (emailConfig as { smtp_password?: string }).smtp_password,
        },
      });

      // Verify the connection
      await transporter.verify();

      // Send a test email
      const testResult = await transporter.sendMail({
        from: `"${(emailConfig as { from_name?: string }).from_name}" <${(emailConfig as { from_email?: string }).from_email}>`,
        to: email,
        subject: "KRAPI Email Configuration Test",
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify your KRAPI email configuration.</p>
          <p>If you received this email, your configuration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: "This is a test email to verify your KRAPI email configuration.",
      });

      return {
        success: true,
        message: `Test email sent successfully to ${email}. Message ID: ${testResult.messageId}`,
      };
    } catch (error) {
      console.error("Test email config error:", error);
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
   * Get email templates for a project
   */
  async getEmailTemplates(
    projectId: string
  ): Promise<Record<string, unknown>[]> {
    await this.core.ensureReady();
    
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      `SELECT * FROM email_templates 
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<Record<string, unknown> | null> {
    await this.core.ensureReady();
    
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      `SELECT * FROM email_templates 
       WHERE project_id = $1 AND id = $2`,
      [projectId, templateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create email template
   */
  async createEmailTemplate(
    projectId: string,
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.core.ensureReady();
    
    const { name, subject, body, variables } = templateData as {
      name: string;
      subject: string;
      body: string;
      variables?: string[];
    };
    const templateId = uuidv4();
    const createdAt = new Date().toISOString();

    // Email templates are in main DB
    await this.dbManager.queryMain(
      `INSERT INTO email_templates (id, project_id, name, subject, body, variables, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        templateId,
        projectId,
        name,
        subject,
        body,
        JSON.stringify(variables || []),
        createdAt,
        createdAt,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM email_templates WHERE id = $1",
      [templateId]
    );

    return result.rows[0] as Record<string, unknown>;
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(
    projectId: string,
    templateId: string,
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    await this.core.ensureReady();
    
    const { name, subject, body, variables } = templateData as {
      name?: string;
      subject?: string;
      body?: string;
      variables?: string[];
    };

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (subject !== undefined) {
      updates.push(`subject = $${paramCount++}`);
      values.push(subject);
    }
    if (body !== undefined) {
      updates.push(`body = $${paramCount++}`);
      values.push(body);
    }
    if (variables !== undefined) {
      updates.push(`variables = $${paramCount++}`);
      values.push(JSON.stringify(variables));
    }

    if (updates.length === 0) {
      return this.getEmailTemplate(projectId, templateId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(templateId, projectId);

    // Email templates are in main DB
    await this.dbManager.queryMain(
      `UPDATE email_templates SET ${updates.join(", ")} WHERE id = $${paramCount} AND project_id = $${paramCount + 1}`,
      values
    );

    // Query back the updated row
    return this.getEmailTemplate(projectId, templateId);
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<boolean> {
    await this.core.ensureReady();
    
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      "DELETE FROM email_templates WHERE id = $1 AND project_id = $2",
      [templateId, projectId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Send email
   */
  async sendEmail(
    projectId: string,
    emailData: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.core.ensureReady();

      // Get the project to check if email is configured
      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Check if email configuration exists
      const emailConfig = project.settings?.email_config;
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
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: (emailConfig as { smtp_host?: string }).smtp_host,
        port: (emailConfig as { smtp_port?: number }).smtp_port,
        secure: (emailConfig as { smtp_secure?: boolean }).smtp_secure,
        auth: {
          user: (emailConfig as { smtp_username?: string }).smtp_username,
          pass: (emailConfig as { smtp_password?: string }).smtp_password,
        },
      });

      const result = await transporter.sendMail({
        from: `"${(emailConfig as { from_name?: string }).from_name}" <${(emailConfig as { from_email?: string }).from_email}>`,
        to: Array.isArray(to) ? (to as string[]).join(", ") : (to as string),
        subject: subject as string,
        html: body as string,
        text: (emailData.text as string) || (body as string),
        cc: emailData.cc as string | string[] | undefined,
        bcc: emailData.bcc as string | string[] | undefined,
        replyTo: emailData.replyTo as string | undefined,
        attachments: emailData.attachments as
          | Array<{
              filename?: string;
              content?: string | Buffer;
              path?: string;
              contentType?: string;
            }>
          | undefined,
      });

      return {
        success: true,
        message: `Email sent successfully. Message ID: ${
          (result as { messageId?: string }).messageId || "unknown"
        }`,
      };
    } catch (error) {
      console.error("Send email error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }
}








