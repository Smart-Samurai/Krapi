import nodemailer from "nodemailer";
import { DatabaseService } from "./database.service";
import { Project, EmailConfig } from "@/types";
import { EmailTemplate, EmailSendRequest } from "krapi-sdk";

export class EmailService {
  private static instance: EmailService;
  private db: DatabaseService;
  private transporters: Map<string, nodemailer.Transporter>;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.transporters = new Map();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private getTransporter(project: Project): nodemailer.Transporter | null {
    try {
      // Check if we already have a transporter for this project
      if (this.transporters.has(project.id)) {
        return this.transporters.get(project.id)!;
      }

      // Get email configuration
      let emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        const defaultConfig = this.getDefaultConfig();
        if (!defaultConfig) {
          return null;
        }
        emailConfig = defaultConfig;
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_secure,
        auth: {
          user: emailConfig.smtp_username,
          pass: emailConfig.smtp_password,
        },
      });

      // Store transporter
      this.transporters.set(project.id, transporter);
      return transporter;
    } catch (error) {
      console.error("Get transporter error:", error);
      return null;
    }
  }

  private getDefaultConfig(): EmailConfig | null {
    if (
      !process.env.DEFAULT_SMTP_HOST ||
      !process.env.DEFAULT_SMTP_USER ||
      !process.env.DEFAULT_SMTP_PASS
    ) {
      return null;
    }

    return {
      smtp_host: process.env.DEFAULT_SMTP_HOST,
      smtp_port: parseInt(process.env.DEFAULT_SMTP_PORT || "587"),
      smtp_secure: process.env.DEFAULT_SMTP_SECURE === "true",
      smtp_user: process.env.DEFAULT_SMTP_USER,
      smtp_pass: process.env.DEFAULT_SMTP_PASS,
      from_email:
        process.env.DEFAULT_FROM_EMAIL || process.env.DEFAULT_SMTP_USER,
      from_name: process.env.DEFAULT_FROM_NAME || "Krapi System",
    };
  }

  async sendEmail(
    projectId: string,
    to: string | string[],
    subject: string,
    html: string,
    options?: {
      text?: string;
      attachments?: Array<{
        filename?: string;
        content?: string | Buffer;
        path?: string;
        contentType?: string;
      }>;
      cc?: string | string[];
      bcc?: string | string[];
      replyTo?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const transporter = this.getTransporter(project);
      if (!transporter) {
        return {
          success: false,
          error: "Email not configured for this project",
        };
      }

      const emailConfig =
        project.settings.email_config || this.getDefaultConfig();
      if (!emailConfig) {
        return { success: false, error: "Email configuration not found" };
      }

      const info = await transporter.sendMail({
        from: `"${emailConfig.from_name}" <${emailConfig.from_email}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text: options?.text,
        attachments: options?.attachments,
        cc: options?.cc,
        bcc: options?.bcc,
        replyTo: options?.replyTo,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Send email error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  async sendVerificationEmail(
    projectId: string,
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <h2>Verify Your Email</h2>
      <p>Hello ${userName || "there"},</p>
      <p>Please click the link below to verify your email address:</p>
      <a href="${
        process.env.FRONTEND_URL
      }/verify-email?token=${verificationToken}">
        Verify Email
      </a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `;

    return this.sendEmail(projectId, email, "Verify Your Email", html);
  }

  async sendPasswordResetEmail(
    projectId: string,
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${userName || "there"},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">
        Reset Password
      </a>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;

    return this.sendEmail(projectId, email, "Password Reset Request", html);
  }

  async sendWelcomeEmail(
    projectId: string,
    email: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <h2>Welcome to Krapi!</h2>
      <p>Hello ${userName || "there"},</p>
      <p>Welcome to Krapi! Your account has been successfully created.</p>
      <p>You can now start using all the features of our platform.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    `;

    return this.sendEmail(projectId, email, "Welcome!", html);
  }

  // Send email using EmailSendRequest format (for SDK compatibility)
  async sendEmailRequest(request: EmailSendRequest): Promise<boolean> {
    const result = await this.sendEmail(
      request.projectId,
      Array.isArray(request.to) ? request.to[0] : request.to,
      request.subject || "",
      request.body || "",
      {
        text: request.body, // Use body as text fallback
        attachments: request.attachments || [],
      }
    );
    return result.success;
  }

  // Get email templates for a project
  async getTemplates(_projectId: string): Promise<EmailTemplate[]> {
    try {
      // For now, return empty array - templates would be stored in database
      // This is a placeholder implementation
      return [];
    } catch (error) {
      console.error("Get templates error:", error);
      return [];
    }
  }

  // Get a specific email template
  async getTemplate(_id: string): Promise<EmailTemplate | null> {
    try {
      // For now, return null - templates would be stored in database
      // This is a placeholder implementation
      return null;
    } catch (error) {
      console.error("Get template error:", error);
      return null;
    }
  }

  // Create a new email template
  async createTemplate(
    templateData: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    try {
      // For now, return a mock template - templates would be stored in database
      // This is a placeholder implementation
      const template: EmailTemplate = {
        id: `template_${Date.now()}`,
        projectId: templateData.projectId || "",
        name: templateData.name || "New Template",
        subject: templateData.subject || "",
        html: templateData.html || "",
        text: templateData.text || "",
        variables: templateData.variables || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return template;
    } catch (error) {
      console.error("Create template error:", error);
      throw new Error("Failed to create template");
    }
  }

  // Update an existing email template
  async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    try {
      // For now, return a mock updated template - templates would be stored in database
      // This is a placeholder implementation
      const template: EmailTemplate = {
        id,
        projectId: updates.projectId || "",
        name: updates.name || "Updated Template",
        subject: updates.subject || "",
        html: updates.html || "",
        text: updates.text || "",
        variables: updates.variables || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return template;
    } catch (error) {
      console.error("Update template error:", error);
      throw new Error("Failed to update template");
    }
  }

  // Delete an email template
  async deleteTemplate(_id: string): Promise<boolean> {
    try {
      // For now, return true - templates would be deleted from database
      // This is a placeholder implementation
      return true;
    } catch (error) {
      console.error("Delete template error:", error);
      return false;
    }
  }

  // Get email configuration for a project
  async getConfig(projectId: string): Promise<EmailConfig> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        // Return default config if no project-specific config
        const defaultConfig = this.getDefaultConfig();
        if (!defaultConfig) {
          throw new Error("No email configuration available");
        }
        return defaultConfig;
      }

      return emailConfig;
    } catch (error) {
      console.error("Get email config error:", error);
      throw new Error("Failed to get email configuration");
    }
  }

  // Update email configuration for a project
  async updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<EmailConfig> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      // Get current config
      const currentConfig =
        project.settings?.email_config || this.getDefaultConfig();
      if (!currentConfig) {
        throw new Error("No current email configuration");
      }

      // Merge updates
      const updatedConfig: EmailConfig = {
        ...currentConfig,
        ...config,
      };

      // Update project settings
      await this.db.updateProjectSettings(projectId, {
        email_config: updatedConfig,
      });

      // Clear transporter cache for this project
      this.clearTransporter(projectId);

      return updatedConfig;
    } catch (error) {
      console.error("Update email config error:", error);
      throw new Error("Failed to update email configuration");
    }
  }

  // Test email configuration
  async testConfig(
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const emailConfig = await this.getConfig(projectId);
      const result = await this.testEmailConfig(emailConfig);

      if (result.success) {
        return {
          success: true,
          message: "Email configuration test successful",
        };
      } else {
        return {
          success: false,
          message: result.error || "Email configuration test failed",
        };
      }
    } catch (error) {
      console.error("Test config error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to test configuration",
      };
    }
  }

  // Test email configuration
  async testEmailConfig(
    emailConfig: EmailConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_secure,
        auth: {
          user: emailConfig.smtp_user,
          pass: emailConfig.smtp_pass,
        },
      });

      // Verify connection configuration
      await transporter.verify();

      return { success: true };
    } catch (error) {
      console.error("Test email config error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to test email configuration",
      };
    }
  }

  // Clear transporter cache for a specific project
  clearTransporter(projectId: string): void {
    this.transporters.delete(projectId);
  }

  // Clear all transporter caches
  clearAllTransporters(): void {
    this.transporters.clear();
  }
}
