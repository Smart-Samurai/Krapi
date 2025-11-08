import { EmailService } from "@krapi/sdk";

/**
 * SDK Email Service Wrapper
 * 
 * Wrapper service that delegates to the SDK EmailService.
 * Provides a consistent interface for backend services to access email operations.
 * 
 * @class SDKEmailService
 * @example
 * const emailService = new EmailService(dbConnection);
 * const sdkEmailService = new SDKEmailService(emailService);
 * await sdkEmailService.sendEmailToProject('project-id', emailData);
 */
export class SDKEmailService {
  /**
   * Create a new SDKEmailService instance
   * 
   * @param {EmailService} emailService - SDK EmailService instance
   */
  constructor(private emailService: EmailService) {}

  async sendEmail(_emailData: {
    to: string | string[];
    subject: string;
    body: string;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: {
      filename: string;
      content: Buffer;
      contentType: string;
    }[];
  }): Promise<unknown> {
    // SDK expects: sendEmail(projectId, emailData: EmailRequest)
    // EmailRequest requires project_id, so we need to get it from context
    throw new Error(
      "sendEmail requires project_id - use sendEmailToProject instead"
    );
  }

  /**
   * Send email to project recipients
   * 
   * @param {string} projectId - Project ID
   * @param {Object} emailData - Email data
   * @param {string | string[]} emailData.to - Recipient email(s)
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (HTML)
   * @param {string} [emailData.from] - Sender email
   * @param {string} [emailData.replyTo] - Reply-to email
   * @param {string[]} [emailData.cc] - CC recipients
   * @param {string[]} [emailData.bcc] - BCC recipients
   * @param {Array} [emailData.attachments] - Email attachments
   * @returns {Promise<unknown>} Send result
   * 
   * @example
   * await sdkEmailService.sendEmailToProject('project-id', {
   *   to: 'user@example.com',
   *   subject: 'Welcome',
   *   body: '<h1>Welcome!</h1>'
   * });
   */
  async sendEmailToProject(
    projectId: string,
    emailData: {
      to: string | string[];
      subject: string;
      body: string;
      from?: string;
      replyTo?: string;
      cc?: string[];
      bcc?: string[];
      attachments?: {
        filename: string;
        content: Buffer;
        contentType: string;
      }[];
    }
  ): Promise<unknown> {
    // SDK expects: sendEmail(projectId, emailData: EmailRequest)
    return await this.emailService.sendEmail({
      project_id: projectId,
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,

      replyTo: emailData.replyTo,
      cc: emailData.cc,
      bcc: emailData.bcc,
      attachments: emailData.attachments,
    });
  }

  async sendTemplateEmail(
    _templateId: string,
    _data: Record<string, unknown>
  ): Promise<unknown> {
    // SDK doesn't have sendTemplateEmail, this would need to be implemented
    throw new Error("sendTemplateEmail not implemented in SDK");
  }

  /**
   * Create an email template
   * 
   * @param {Object} templateData - Template data
   * @param {string} templateData.name - Template name
   * @param {string} templateData.subject - Email subject (supports variables)
   * @param {string} templateData.body - Email body (supports variables)
   * @param {string[]} templateData.variables - Available template variables
   * @param {boolean} [templateData.is_active] - Whether template is active
   * @param {string} templateData.project_id - Project ID
   * @returns {Promise<unknown>} Created template
   * 
   * @example
   * const template = await sdkEmailService.createEmailTemplate({
   *   name: 'Welcome Email',
   *   subject: 'Welcome to {{company_name}}!',
   *   body: 'Hello {{user_name}}!',
   *   variables: ['company_name', 'user_name'],
   *   project_id: 'project-id'
   * });
   */
  async createEmailTemplate(templateData: {
    name: string;
    subject: string;
    body: string;
    variables: string[];
    is_active?: boolean;
    project_id: string;
  }): Promise<unknown> {
    // SDK expects: createTemplate(templateData: Omit<EmailTemplate, "id" | "created_at" | "updated_at">)
    return await this.emailService.createTemplate(templateData);
  }

  async updateEmailTemplate(
    _templateId: string,
    _updates: Partial<{
      name: string;
      subject: string;
      body: string;
      variables: string[];
      is_active?: boolean;
    }>
  ): Promise<unknown> {
    // SDK expects: updateTemplate(templateId, templateData)
    throw new Error("updateEmailTemplate not implemented in SDK");
  }

  async deleteEmailTemplate(_templateId: string): Promise<boolean> {
    // SDK expects: deleteTemplate(templateId)
    throw new Error("deleteEmailTemplate not implemented in SDK");
  }

  async getEmailTemplateById(_templateId: string): Promise<unknown> {
    // SDK doesn't have getEmailTemplateById, this would need to be implemented
    throw new Error("getEmailTemplateById not implemented in SDK");
  }

  async getAllEmailTemplates(
    _options: {
      limit?: number;
      offset?: number;
      search?: string;
      is_active?: boolean;
    } = {}
  ): Promise<unknown[]> {
    // SDK doesn't have getAllEmailTemplates, this would need to be implemented
    throw new Error("getAllEmailTemplates not implemented in SDK");
  }

  async testEmailTemplate(
    _templateId: string,
    _testData: Record<string, unknown>
  ): Promise<unknown> {
    // SDK doesn't have testEmailTemplate, this would need to be implemented
    throw new Error("testEmailTemplate not implemented in SDK");
  }

  async getEmailConfig(_projectId: string): Promise<unknown> {
    // SDK doesn't have getEmailConfig, this would need to be implemented
    throw new Error("getEmailConfig not implemented in SDK");
  }

  async updateEmailConfig(
    _projectId: string,
    _config: {
      smtp_host: string;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_username: string;
      smtp_password: string;
      from_email: string;
      from_name: string;
    }
  ): Promise<unknown> {
    // SDK expects: updateConfig(projectId, config: EmailConfig)
    throw new Error("updateEmailConfig not implemented in SDK");
  }

  async testEmailConfig(_projectId: string): Promise<unknown> {
    // SDK expects: testConfig(projectId)
    throw new Error("testEmailConfig not implemented in SDK");
  }

  async getEmailLogs(
    _options: {
      limit?: number;
      offset?: number;
      project_id?: string;
      status?: string;
      from_date?: Date;
      to_date?: Date;
    } = {}
  ): Promise<unknown[]> {
    // SDK doesn't have getEmailLogs, this would need to be implemented
    throw new Error("getEmailLogs not implemented in SDK");
  }

  async resendFailedEmail(_emailId: string): Promise<unknown> {
    // SDK doesn't have resendFailedEmail, this would need to be implemented
    throw new Error("resendFailedEmail not implemented in SDK");
  }
}
