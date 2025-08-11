import { EmailService } from "./email.service";
import { DatabaseService } from "./database.service";
import {
  EmailTemplate,
  EmailSendRequest,
  EmailConfig,
  ApiResponse,
} from "@krapi/sdk";
import { TypeMapper } from "../lib/type-mapper";

// Local interface definition since backend interfaces are not exported from main SDK
interface IEmailServiceBackend {
  sendEmail(request: EmailSendRequest): Promise<ApiResponse<void>>;
  getTemplates(projectId: string): Promise<ApiResponse<EmailTemplate[]>>;
  getTemplate(id: string): Promise<ApiResponse<EmailTemplate>>;
  createTemplate(
    template: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>>;
  updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>>;
  deleteTemplate(id: string): Promise<ApiResponse<void>>;
  testConfig(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;
  getConfig(projectId: string): Promise<ApiResponse<EmailConfig>>;
  updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<ApiResponse<EmailConfig>>;
}

export class EmailAdapterService implements IEmailServiceBackend {
  private static instance: EmailAdapterService;
  private emailService: EmailService;
  private db: DatabaseService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): EmailAdapterService {
    if (!EmailAdapterService.instance) {
      EmailAdapterService.instance = new EmailAdapterService();
    }
    return EmailAdapterService.instance;
  }

  async sendEmail(request: EmailSendRequest): Promise<ApiResponse<void>> {
    try {
      // Extract data from EmailSendRequest and call EmailService.sendEmail with correct arguments
      // Note: EmailService.sendEmail expects projectId, but EmailSendRequest doesn't have it
      // We'll need to get projectId from the template or use a default
      let projectId = "";

      if (request.template_id) {
        // Try to get projectId from template
        const template = await this.db.getEmailTemplate(
          "",
          request.template_id
        );
        if (template) {
          projectId = template.project_id;
        }
      }

      if (!projectId) {
        return {
          success: false,
          error: "projectId is required but not available in EmailSendRequest",
        };
      }

      const result = await this.emailService.sendEmail(
        projectId,
        Array.isArray(request.to) ? request.to[0] : request.to,
        request.subject || "",
        request.body || "",
        {
          text: request.body, // Use body as text fallback
          attachments: request.attachments || [],
        }
      );

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  async getTemplates(projectId: string): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const templates = await this.db.getEmailTemplates(projectId);
      const mappedTemplates = templates.map((template) =>
        TypeMapper.mapEmailTemplate(template)
      );
      return { success: true, data: mappedTemplates };
    } catch (error) {
      console.error("Get email templates error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get email templates",
      };
    }
  }

  async getTemplate(_id: string): Promise<ApiResponse<EmailTemplate>> {
    // We need projectId to get the template, but the interface doesn't provide it
    // For now, we'll need to find a way to get projectId from the template ID
    // This is a limitation of the current interface design
    return {
      success: false,
      error:
        "getTemplate requires projectId which is not available in the current interface",
    };
  }

  async createTemplate(
    template: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>> {
    try {
      if (!template.project_id) {
        return {
          success: false,
          error: "project_id is required to create email template",
        };
      }

      const newTemplate = await this.db.createEmailTemplate(
        template.project_id,
        {
          name: template.name || "",
          subject: template.subject || "",
          body: template.body || "",
          variables: template.variables || [],
        }
      );

      const mappedTemplate = TypeMapper.mapEmailTemplate(newTemplate);
      return { success: true, data: mappedTemplate };
    } catch (error) {
      console.error("Create email template error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create email template",
      };
    }
  }

  async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>> {
    try {
      if (!updates.project_id) {
        return {
          success: false,
          error: "project_id is required to update email template",
        };
      }

      const updatedTemplate = await this.db.updateEmailTemplate(
        updates.project_id,
        id,
        {
          name: updates.name,
          subject: updates.subject,
          body: updates.body,
          variables: updates.variables,
        }
      );

      if (!updatedTemplate) {
        return {
          success: false,
          error: "Template not found",
        };
      }

      const mappedTemplate = TypeMapper.mapEmailTemplate(updatedTemplate);
      return { success: true, data: mappedTemplate };
    } catch (error) {
      console.error("Update email template error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update email template",
      };
    }
  }

  async deleteTemplate(_id: string): Promise<ApiResponse<void>> {
    // We need projectId to delete the template, but the interface doesn't provide it
    // This is a limitation of the current interface design
    return {
      success: false,
      error:
        "deleteTemplate requires projectId which is not available in the current interface",
    };
  }

  async testConfig(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        return { success: false, error: "Email configuration not found" };
      }

      // Use the testEmailConfig method from EmailService
      const testResult = await this.emailService.testEmailConfig(emailConfig);
      return {
        success: true,
        data: {
          success: testResult.success,
          message: testResult.error || "Test completed successfully",
        },
      };
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

  async getConfig(projectId: string): Promise<ApiResponse<EmailConfig>> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        return { success: false, error: "Email configuration not found" };
      }

      // Map backend EmailConfig to SDK EmailConfig
      const mappedConfig = {
        smtp_host: emailConfig.smtp_host,
        smtp_port: emailConfig.smtp_port,
        smtp_secure: emailConfig.smtp_secure,
        smtp_username: emailConfig.smtp_username,
        smtp_password: emailConfig.smtp_password,
        from_email: emailConfig.from_email,
        from_name: emailConfig.from_name,
      };

      return { success: true, data: mappedConfig };
    } catch (error) {
      console.error("Get email config error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get email configuration",
      };
    }
  }

  async updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<ApiResponse<EmailConfig>> {
    try {
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      // Update the project with new email config
      const updatedProject = await this.db.updateProject(projectId, {
        settings: {
          ...project.settings,
          email_config: {
            smtp_host:
              config.smtp_host ||
              project.settings?.email_config?.smtp_host ||
              "",
            smtp_port:
              config.smtp_port ||
              project.settings?.email_config?.smtp_port ||
              587,
            smtp_secure:
              config.smtp_secure ??
              project.settings?.email_config?.smtp_secure ??
              false,
            smtp_username:
              config.smtp_username ||
              project.settings?.email_config?.smtp_username ||
              "",
            smtp_password:
              config.smtp_password ||
              project.settings?.email_config?.smtp_password ||
              "",
            from_email:
              config.from_email ||
              project.settings?.email_config?.from_email ||
              "",
            from_name:
              config.from_name ||
              project.settings?.email_config?.from_name ||
              "",
          },
        },
      });

      if (!updatedProject) {
        return { success: false, error: "Failed to update project" };
      }

      const emailConfig = updatedProject.settings?.email_config;
      if (!emailConfig) {
        return {
          success: false,
          error: "Failed to update email configuration",
        };
      }

      // Return the updated config in SDK format
      const mappedConfig = {
        smtp_host: emailConfig.smtp_host,
        smtp_port: emailConfig.smtp_port,
        smtp_secure: emailConfig.smtp_secure,
        smtp_username: emailConfig.smtp_username,
        smtp_password: emailConfig.smtp_password,
        from_email: emailConfig.from_email,
        from_name: emailConfig.from_name,
      };

      return { success: true, data: mappedConfig };
    } catch (error) {
      console.error("Update email config error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update email configuration",
      };
    }
  }
}
