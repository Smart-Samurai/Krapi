import {
  EmailTemplate,
  EmailSendRequest,
  EmailConfig,
  ApiResponse,
} from "@smartsamurai/krapi-sdk";

import { TypeMapper } from "../lib/type-mapper";

import { DatabaseService } from "./database.service";
import { EmailService } from "./email.service";

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

/**
 * Email Adapter Service
 * 
 * Wraps the existing EmailService to provide a consistent interface for the BackendSDK.
 * Implements the IEmailServiceBackend interface for SDK compatibility.
 * 
 * @class EmailAdapterService
 * @implements {IEmailServiceBackend}
 * @example
 * const adapter = EmailAdapterService.getInstance();
 * await adapter.sendEmail({ project_id: 'project-id', to: 'user@example.com', subject: 'Hello', body: 'World' });
 */
export class EmailAdapterService implements IEmailServiceBackend {
  private static instance: EmailAdapterService;
  private emailService: EmailService;
  private db: DatabaseService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get singleton instance of EmailAdapterService
   * 
   * @returns {EmailAdapterService} The singleton instance
   * 
   * @example
   * const adapter = EmailAdapterService.getInstance();
   */
  static getInstance(): EmailAdapterService {
    if (!EmailAdapterService.instance) {
      EmailAdapterService.instance = new EmailAdapterService();
    }
    return EmailAdapterService.instance;
  }

  /**
   * Send an email
   * 
   * @param {EmailSendRequest} request - Email send request
   * @returns {Promise<ApiResponse<void>>} Send result
   * 
   * @example
   * const result = await adapter.sendEmail({
   *   project_id: 'project-id',
   *   to: 'user@example.com',
   *   subject: 'Hello',
   *   body: 'World'
   * });
   */
  async sendEmail(request: EmailSendRequest): Promise<ApiResponse<void>> {
    try {
      // Extract data from EmailSendRequest and call EmailService.sendEmail with correct arguments
      // EmailSendRequest may have project_id directly, or we need to get it from template
      // Type assertion needed as EmailSendRequest type may not include project_id
      const requestWithProjectId = request as EmailSendRequest & { project_id?: string };
      let projectId = "";
      
      // First, check if project_id is in the request (from handler)
      if (requestWithProjectId.project_id && typeof requestWithProjectId.project_id === 'string') {
        projectId = requestWithProjectId.project_id;
      } else if (request.template_id) {
        // Try to get projectId from template
        const template = await this.db.getEmailTemplate(
          "",
          request.template_id
        );
        if (template) {
          projectId = template.project_id as string;
        }
      }

      if (!projectId) {
        return {
          success: false,
          error: "projectId is required but not available in EmailSendRequest",
        };
      }

      const to = Array.isArray(request.to) ? request.to[0] : request.to;
      if (!to) {
        return { success: false, error: "Recipient email is required" };
      }
      const result = await this.emailService.sendEmail(
        projectId,
        to,
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
        const errorMessage = result.error || "Unknown error";
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  /**
   * Get all email templates for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<ApiResponse<EmailTemplate[]>>} Templates result
   * 
   * @example
   * const result = await adapter.getTemplates('project-id');
   * if (result.success) {
   *   console.log('Templates:', result.data);
   * }
   */
  async getTemplates(projectId: string): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const templates = await this.db.getEmailTemplates(projectId);
      const mappedTemplates = templates.map((template) =>
        TypeMapper.mapEmailTemplate(template as {
          id: string;
          project_id: string;
          name: string;
          subject: string;
          body: string;
          variables?: string[];
          created_at: string;
          updated_at: string;
        })
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

  /**
   * Get email template by ID
   * 
   * @param {string} _id - Template ID
   * @returns {Promise<ApiResponse<EmailTemplate>>} Template result
   * @throws {Error} Requires projectId which is not available in current interface
   * 
   * @example
   * const result = await adapter.getTemplate('template-id');
   */
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

  /**
   * Create an email template
   * 
   * @param {Partial<EmailTemplate>} template - Template data
   * @param {string} template.project_id - Project ID (required)
   * @param {string} template.name - Template name
   * @param {string} template.subject - Email subject
   * @param {string} template.body - Email body
   * @param {string[]} template.variables - Template variables
   * @returns {Promise<ApiResponse<EmailTemplate>>} Created template result
   * 
   * @example
   * const result = await adapter.createTemplate({
   *   project_id: 'project-id',
   *   name: 'Welcome',
   *   subject: 'Welcome!',
   *   body: 'Hello {{name}}!',
   *   variables: ['name']
   * });
   */
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

      const mappedTemplate = TypeMapper.mapEmailTemplate(newTemplate as {
        id: string;
        project_id: string;
        name: string;
        subject: string;
        body: string;
        variables?: string[];
        created_at: string;
        updated_at: string;
      });
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

  /**
   * Update an email template
   * 
   * @param {string} id - Template ID
   * @param {Partial<EmailTemplate>} updates - Template updates
   * @param {string} updates.project_id - Project ID (required)
   * @returns {Promise<ApiResponse<EmailTemplate>>} Updated template result
   * 
   * @example
   * const result = await adapter.updateTemplate('template-id', {
   *   project_id: 'project-id',
   *   subject: 'Updated Subject'
   * });
   */
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

      const mappedTemplate = TypeMapper.mapEmailTemplate(updatedTemplate as {
        id: string;
        project_id: string;
        name: string;
        subject: string;
        body: string;
        variables?: string[];
        created_at: string;
        updated_at: string;
      });
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

      // Map settings.host and settings.port to smtp_host and smtp_port if provided
      // SDK sends { provider: "smtp", settings: { host: "...", port: ... } }
      // But we need smtp_host and smtp_port at the top level
      // CRITICAL: Always prioritize settings.host/port from request over config.smtp_host/port
      let smtpHost: string | undefined = undefined;
      let smtpPort: number | undefined = undefined;

      // DEBUG: Log incoming config
      console.log(`[EMAIL ADAPTER] updateConfig called for project ${projectId}`);
      console.log(`[EMAIL ADAPTER] Incoming config:`, JSON.stringify(config, null, 2));
      
      // Check if config has settings object with host/port (SDK format)
      // Type assertion needed as EmailConfig may have settings property that's not in the type definition
      const configWithSettings = config as Partial<EmailConfig> & { settings?: Record<string, unknown> };
      if (configWithSettings.settings && typeof configWithSettings.settings === 'object') {
        const settings = configWithSettings.settings;
        console.log(`[EMAIL ADAPTER] Found settings object:`, JSON.stringify(settings, null, 2));
        // Priority: settings.host from request > config.smtp_host > existing config
        if (settings.host && typeof settings.host === 'string' && settings.host.trim() !== '') {
          smtpHost = settings.host;
          console.log(`[EMAIL ADAPTER] Extracted smtpHost from settings.host: "${smtpHost}"`);
        }
        // Priority: settings.port from request > config.smtp_port > existing config
        if (settings.port !== undefined && settings.port !== null) {
          smtpPort = typeof settings.port === 'number' ? settings.port : parseInt(String(settings.port), 10);
          console.log(`[EMAIL ADAPTER] Extracted smtpPort from settings.port: ${smtpPort}`);
        }
      }
      
      // Fallback to config.smtp_host/smtp_port if settings weren't provided
      // Only use config.smtp_host if it's not empty (empty string means not provided)
      if (smtpHost === undefined) {
        if (config.smtp_host && typeof config.smtp_host === 'string' && config.smtp_host.trim() !== '') {
          smtpHost = config.smtp_host;
        }
      }
      if (smtpPort === undefined) {
        smtpPort = config.smtp_port;
      }

      // DEBUG: Log what we're about to save
      const smtpHostToSave = smtpHost !== undefined && smtpHost !== null && smtpHost !== ""
        ? smtpHost
        : project.settings?.email_config?.smtp_host || "";
      const smtpPortToSave = smtpPort !== undefined && smtpPort !== null
        ? smtpPort
        : project.settings?.email_config?.smtp_port || 587;
      console.log(`[EMAIL ADAPTER] About to save smtp_host: "${smtpHostToSave}", smtp_port: ${smtpPortToSave}`);
      
      // Update the project with new email config
      // CRITICAL: Use request values (smtpHost/smtpPort) if provided, otherwise fall back to existing
      const updatedProject = await this.db.updateProject(projectId, {
        settings: {
          ...project.settings,
          email_config: {
            smtp_host: smtpHostToSave,
            smtp_port: smtpPortToSave,
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

      // DEBUG: Log what we retrieved from database
      console.log(`[EMAIL ADAPTER] Retrieved emailConfig from database:`, JSON.stringify(emailConfig, null, 2));
      console.log(`[EMAIL ADAPTER] emailConfig.smtp_host: "${emailConfig.smtp_host}", emailConfig.smtp_port: ${emailConfig.smtp_port}`);

      // Return the updated config in SDK format
      // CRITICAL: Always return the values that were requested, not just what's in the database
      // This ensures smtp_host and smtp_port match the input values
      // If smtpHost/smtpPort were set from request, use them; otherwise use database values
      const finalSmtpHost = (smtpHost !== undefined && smtpHost !== null && smtpHost !== "")
        ? smtpHost
        : (emailConfig.smtp_host || "");
      const finalSmtpPort = (smtpPort !== undefined && smtpPort !== null)
        ? smtpPort
        : (emailConfig.smtp_port || 587);
      
      console.log(`[EMAIL ADAPTER] Final values to return - smtp_host: "${finalSmtpHost}", smtp_port: ${finalSmtpPort}`);
      
      const mappedConfig = {
        smtp_host: finalSmtpHost,
        smtp_port: finalSmtpPort,
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
