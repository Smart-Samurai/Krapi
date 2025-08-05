import nodemailer from "nodemailer";
import { DatabaseService } from "./database.service";
import { Project, EmailConfig } from "@/types";

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

  // Get or create transporter for a project
  private getTransporter(project: Project): nodemailer.Transporter | null {
    // Check if transporter already exists
    if (this.transporters.has(project.id)) {
      return this.transporters.get(project.id)!;
    }

    // Get email config from project settings
    let emailConfig = project.settings.email_config;
    if (!emailConfig) {
      // Use default config if available
      const defaultConfig = this.getDefaultConfig();
      if (!defaultConfig) {
        return null;
      }
      emailConfig = defaultConfig;
    }

    // Create transporter
    try {
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
      console.error(
        `Failed to create email transporter for project ${project.id}:`,
        error
      );
      return null;
    }
  }

  // Get default email configuration from environment
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
      smtp_username: process.env.DEFAULT_SMTP_USER,
      smtp_password: process.env.DEFAULT_SMTP_PASS,
      from_email: process.env.DEFAULT_EMAIL_FROM || "noreply@krapi.local",
      from_name: "KRAPI",
    };
  }

  // Send email
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
      // Get project
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      // Get transporter
      const transporter = this.getTransporter(project);
      if (!transporter) {
        return {
          success: false,
          error: "Email not configured for this project",
        };
      }

      // Get email config
      const emailConfig =
        project.settings.email_config || this.getDefaultConfig();
      if (!emailConfig) {
        return { success: false, error: "Email configuration not found" };
      }

      // Send email
      const info = await transporter.sendMail({
        from: emailConfig.from_name
          ? `"${emailConfig.from_name}" <${emailConfig.from_email}>`
          : emailConfig.from_email,
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

  // Send verification email
  async sendVerificationEmail(
    projectId: string,
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Hello ${userName || "User"},</p>
        <p>Please click the link below to verify your email address:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request this verification, please ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail(projectId, email, "Verify Your Email", html);
  }

  // Send password reset email
  async sendPasswordResetEmail(
    projectId: string,
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${userName || "User"},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
    `;

    return this.sendEmail(projectId, email, "Password Reset Request", html);
  }

  // Send welcome email
  async sendWelcomeEmail(
    projectId: string,
    email: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome!</h2>
        <p>Hello ${userName || "User"},</p>
        <p>Thank you for joining us! Your account has been successfully created.</p>
        <p>You can now log in and start using our services.</p>
        <p style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Log In
          </a>
        </p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you have any questions, please don't hesitate to contact us.
        </p>
      </div>
    `;

    return this.sendEmail(projectId, email, "Welcome!", html);
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
          user: emailConfig.smtp_username,
          pass: emailConfig.smtp_password,
        },
      });

      // Verify connection
      await transporter.verify();

      // Send test email
      await transporter.sendMail({
        from: emailConfig.from_name
          ? `"${emailConfig.from_name}" <${emailConfig.from_email}>`
          : emailConfig.from_email,
        to: emailConfig.from_email,
        subject: "KRAPI Email Configuration Test",
        text: "This is a test email to verify your SMTP configuration.",
        html: "<p>This is a test email to verify your SMTP configuration.</p>",
      });

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

  // Clear transporter cache for a project
  clearTransporter(projectId: string): void {
    if (this.transporters.has(projectId)) {
      const transporter = this.transporters.get(projectId);
      transporter?.close();
      this.transporters.delete(projectId);
    }
  }

  // Clear all transporters
  clearAllTransporters(): void {
    for (const [_projectId, transporter] of this.transporters) {
      transporter.close();
    }
    this.transporters.clear();
  }
}
