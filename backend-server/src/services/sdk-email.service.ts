import { EmailService } from "@krapi/sdk";

export class SDKEmailService {
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
