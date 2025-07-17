import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import handlebars from "handlebars";
import database from "./database";
import { EmailSendRequest, EmailTemplate, EmailLog } from "../types";

// Import will be available after app.ts exports it
let _broadcastToAll: ((_message: Record<string, unknown>) => void) | null =
  null;

// Function to set the broadcast function from app.ts
export function setBroadcastFunction(
  fn: (_message: Record<string, unknown>) => void
) {
  _broadcastToAll = fn;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeFromDatabase();
  }

  private async initializeFromDatabase(): Promise<void> {
    try {
      const settings = database.getEmailSettings();
      const config: Partial<EmailConfig> = {};

      settings.forEach((setting: { key: string; value: string }) => {
        switch (setting.key) {
          case "smtp_host":
            config.host = setting.value;
            break;
          case "smtp_port":
            config.port = parseInt(setting.value);
            break;
          case "smtp_secure":
            config.secure = setting.value === "true";
            break;
          case "smtp_user":
            if (!config.auth) config.auth = { user: "", pass: "" };
            config.auth.user = setting.value;
            break;
          case "smtp_pass":
            if (!config.auth) config.auth = { user: "", pass: "" };
            config.auth.pass = setting.value;
            break;
          case "smtp_from":
            config.from = setting.value;
            break;
          case "smtp_reply_to":
            config.replyTo = setting.value;
            break;
        }
      });

      if (
        config.host &&
        config.port &&
        config.auth?.user &&
        config.auth?.pass &&
        config.from
      ) {
        this.config = config as EmailConfig;
        await this.createTransporter();
      }
    } catch (error) {
      console.error("Failed to initialize email service from database:", error);
    }
  }

  private async createTransporter(): Promise<void> {
    if (!this.config) {
      throw new Error("Email configuration not set");
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false, // For development, should be true in production
      },
    });

    try {
      if (this.transporter) {
        await this.transporter.verify();
        console.log("Email service initialized successfully");
      }
    } catch (error) {
      console.error("Email service verification failed:", error);
      this.transporter = null;
    }
  }

  async updateConfiguration(settings: Record<string, string>): Promise<void> {
    // Update database settings
    for (const [key, value] of Object.entries(settings)) {
      database.setEmailSetting(key, value);
    }

    // Reinitialize service
    await this.initializeFromDatabase();
  }

  async sendEmail(
    request: EmailSendRequest
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: "Email service not configured" };
    }

    try {
      let html = request.html;
      let text = request.text;
      let subject = request.subject;

      // If template is specified, load and compile it
      if (request.template_name) {
        const template = database.getEmailTemplateByName(request.template_name);
        if (!template) {
          return {
            success: false,
            error: `Template '${request.template_name}' not found`,
          };
        }

        if (!template.active) {
          return {
            success: false,
            error: `Template '${request.template_name}' is disabled`,
          };
        }

        // Compile template with variables
        const variables = request.variables || {};
        const htmlTemplate = handlebars.compile(template.template_html);
        const textTemplate = template.template_text
          ? handlebars.compile(template.template_text)
          : null;
        const subjectTemplate = handlebars.compile(template.subject);

        html = htmlTemplate(variables);
        text = textTemplate ? textTemplate(variables) : undefined;
        subject = subjectTemplate(variables);
      }

      const recipients = Array.isArray(request.to) ? request.to : [request.to];
      const results: Array<{
        success: boolean;
        messageId?: string;
        error?: string;
        recipient: string;
      }> = [];

      // Send to each recipient individually to track delivery
      for (const recipient of recipients) {
        const mailOptions: SendMailOptions = {
          from: request.from || this.config.from,
          to: recipient,
          cc: request.cc,
          bcc: request.bcc,
          subject,
          html,
          text,
          replyTo: request.reply_to || this.config.replyTo,
          attachments: request.attachments,
        };

        try {
          const result = await this.transporter.sendMail(mailOptions);

          // Log email to database
          database.createEmailLog({
            template_id: request.template_name
              ? database.getEmailTemplateByName(request.template_name)?.id
              : undefined,
            recipient_email: recipient,
            sender_email: request.from || this.config.from,
            subject: subject || "",
            status: "sent",
            variables: request.variables || {},
            message_id: result.messageId,
            sent_at: new Date().toISOString(),
          });

          // Broadcast email sent notification via WebSocket
          if (_broadcastToAll) {
            _broadcastToAll({
              type: "email_sent",
              event: "email_delivered",
              data: {
                recipient,
                subject: subject || "",
                messageId: result.messageId,
                template: request.template_name,
                timestamp: new Date().toISOString(),
              },
            });
          }

          results.push({
            success: true,
            messageId: result.messageId,
            recipient,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Log failed email to database
          database.createEmailLog({
            template_id: request.template_name
              ? database.getEmailTemplateByName(request.template_name)?.id
              : undefined,
            recipient_email: recipient,
            sender_email: request.from || this.config.from,
            subject: subject || "",
            status: "failed",
            error_message: errorMessage,
            variables: request.variables || {},
          });

          // Broadcast email failed notification via WebSocket
          if (_broadcastToAll) {
            _broadcastToAll({
              type: "email_failed",
              event: "email_error",
              data: {
                recipient,
                subject: subject || "",
                error: errorMessage,
                template: request.template_name,
                timestamp: new Date().toISOString(),
              },
            });
          }

          results.push({ success: false, error: errorMessage, recipient });
        }
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      return {
        success: successful.length > 0,
        messageId:
          successful.length === 1 ? successful[0].messageId : undefined,
        error:
          failed.length > 0
            ? `Failed to send to: ${failed.map((f) => f.recipient).join(", ")}`
            : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  async sendTemplateEmail(
    templateName: string,
    to: string | string[],
    variables: Record<string, unknown> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      template_name: templateName,
      to,
      variables,
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: "Email service not configured" };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  getConfiguration(): Partial<EmailConfig> | null {
    if (!this.config) return null;

    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.from,
      replyTo: this.config.replyTo,
      // Don't expose sensitive auth info
      auth: {
        user: this.config.auth.user,
        pass: "***", // Masked
      },
    };
  }

  // Email analytics methods
  async getEmailStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    return database.getEmailStats(startDate, endDate);
  }

  async getEmailLogs(
    page = 1,
    limit = 50,
    status?: string
  ): Promise<{
    logs: EmailLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    return database.getEmailLogs(page, limit, status);
  }

  // Template management
  async getTemplates(): Promise<EmailTemplate[]> {
    return database.getAllEmailTemplates();
  }

  async getTemplate(id: number): Promise<EmailTemplate | null> {
    return database.getEmailTemplateById(id);
  }

  async getTemplateByName(name: string): Promise<EmailTemplate | null> {
    return database.getEmailTemplateByName(name);
  }

  // Utility method to send system notifications
  async sendSystemNotification(
    type: "user_created" | "content_updated" | "system_alert",
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get users who want this type of notification
      const users = database.getUsersWithNotificationPreference(type);

      const templateMap = {
        user_created: "user-created-notification",
        content_updated: "content-updated-notification",
        system_alert: "system-alert-notification",
      };

      const templateName = templateMap[type];

      for (const user of users) {
        if (user.email) {
          await this.sendTemplateEmail(templateName, user.email, {
            user: user,
            ...data,
          });
        }
      }
    } catch (error) {
      console.error("Failed to send system notification:", error);
    }
  }
}

// Export singleton instance
export default new EmailService();
