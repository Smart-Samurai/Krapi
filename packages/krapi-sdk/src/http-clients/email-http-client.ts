/**
 * Email HTTP Client for KRAPI SDK
 * 
 * HTTP-based email methods for frontend applications.
 * Provides email configuration, template management, and email sending.
 * 
 * @module http-clients/email-http-client
 * @example
 * const client = new EmailHttpClient({ baseUrl: 'https://api.example.com' });
 * await client.sendEmail('project-id', { to: 'user@example.com', subject: 'Hello', body: 'World' });
 */
import { ApiResponse, PaginatedResponse } from "../core";
import {
  EmailConfig,
  EmailTemplate,
  EmailRequest,
  EmailHistory,
  EmailProvider,
} from "../email-service";

import { BaseHttpClient } from "./base-http-client";

/**
 * Email HTTP Client
 * 
 * HTTP client for email operations.
 * 
 * @class EmailHttpClient
 * @extends {BaseHttpClient}
 * @example
 * const client = new EmailHttpClient({ baseUrl: 'https://api.example.com' });
 * const config = await client.getConfig('project-id');
 */
export class EmailHttpClient extends BaseHttpClient {
  // Email Configuration
  async getConfig(projectId: string): Promise<ApiResponse<EmailConfig>> {
    return this.get<EmailConfig>(`/projects/${projectId}/email/config`);
  }

  async updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<ApiResponse<EmailConfig>> {
    return this.put<EmailConfig>(`/projects/${projectId}/email/config`, config);
  }

  async testConfig(
    projectId: string,
    testEmail: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.post<{ success: boolean; message?: string }>(
      `/projects/${projectId}/email/test`,
      { email: testEmail }
    );
  }

  // Email Templates
  async getTemplates(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      type?: string;
    }
  ): Promise<PaginatedResponse<EmailTemplate>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.search) params.append("search", options.search);
    if (options?.type) params.append("type", options.type);

    const url = params.toString()
      ? `/projects/${projectId}/email/templates?${params}`
      : `/projects/${projectId}/email/templates`;

    return this.getPaginated<EmailTemplate>(url);
  }

  async getTemplate(
    projectId: string,
    templateId: string
  ): Promise<ApiResponse<EmailTemplate>> {
    return this.get<EmailTemplate>(
      `/projects/${projectId}/email/templates/${templateId}`
    );
  }

  async createTemplate(
    projectId: string,
    template: {
      name: string;
      subject: string;
      body: string;
      variables: string[];
      type?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<ApiResponse<EmailTemplate>> {
    return this.post<EmailTemplate>(
      `/projects/${projectId}/email/templates`,
      template
    );
  }

  async updateTemplate(
    projectId: string,
    templateId: string,
    updates: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>> {
    return this.put<EmailTemplate>(
      `/projects/${projectId}/email/templates/${templateId}`,
      updates
    );
  }

  async deleteTemplate(
    projectId: string,
    templateId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/email/templates/${templateId}`
    );
  }

  async duplicateTemplate(
    projectId: string,
    templateId: string,
    newName: string
  ): Promise<ApiResponse<EmailTemplate>> {
    return this.post<EmailTemplate>(
      `/projects/${projectId}/email/templates/${templateId}/duplicate`,
      { name: newName }
    );
  }

  // Email Sending
  async sendEmail(
    projectId: string,
    emailRequest: EmailRequest
  ): Promise<
    ApiResponse<{ success: boolean; message_id?: string; sent_at: string }>
  > {
    return this.post<{
      success: boolean;
      message_id?: string;
      sent_at: string;
    }>(`/projects/${projectId}/email/send`, emailRequest);
  }

  async sendBulkEmail(
    projectId: string,
    bulkRequest: {
      template_id: string;
      recipients: Array<{
        email: string;
        name?: string;
        variables?: Record<string, unknown>;
      }>;
      subject?: string;
      from_email?: string;
      from_name?: string;
      scheduled_at?: string;
    }
  ): Promise<
    ApiResponse<{ success: boolean; message_ids: string[]; sent_at: string }>
  > {
    return this.post<{
      success: boolean;
      message_ids: string[];
      sent_at: string;
    }>(`/projects/${projectId}/email/bulk-send`, bulkRequest);
  }

  async sendTemplateEmail(
    projectId: string,
    templateId: string,
    emailData: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      variables?: Record<string, unknown>;
      subject?: string;
      from_email?: string;
      from_name?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        content_type: string;
      }>;
    }
  ): Promise<
    ApiResponse<{ success: boolean; message_id?: string; sent_at: string }>
  > {
    return this.post<{
      success: boolean;
      message_id?: string;
      sent_at: string;
    }>(`/projects/${projectId}/email/templates/${templateId}/send`, emailData);
  }

  // Email Scheduling
  async scheduleEmail(
    projectId: string,
    scheduledEmail: {
      template_id?: string;
      to: string | string[];
      subject: string;
      body: string;
      scheduled_at: string;
      variables?: Record<string, unknown>;
      from_email?: string;
      from_name?: string;
    }
  ): Promise<
    ApiResponse<{
      success: boolean;
      scheduled_id: string;
      scheduled_at: string;
    }>
  > {
    return this.post<{
      success: boolean;
      scheduled_id: string;
      scheduled_at: string;
    }>(`/projects/${projectId}/email/schedule`, scheduledEmail);
  }

  async getScheduledEmails(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: "pending" | "sent" | "cancelled";
      scheduled_after?: string;
      scheduled_before?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      template_id?: string;
      to: string[];
      subject: string;
      body: string;
      scheduled_at: string;
      status: "pending" | "sent" | "cancelled";
      sent_at?: string;
      created_at: string;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.status) params.append("status", options.status);
    if (options?.scheduled_after)
      params.append("scheduled_after", options.scheduled_after);
    if (options?.scheduled_before)
      params.append("scheduled_before", options.scheduled_before);

    const url = params.toString()
      ? `/projects/${projectId}/email/scheduled?${params}`
      : `/projects/${projectId}/email/scheduled`;

    return this.getPaginated<{
      id: string;
      template_id?: string;
      to: string[];
      subject: string;
      body: string;
      scheduled_at: string;
      status: "pending" | "sent" | "cancelled";
      sent_at?: string;
      created_at: string;
    }>(url);
  }

  async cancelScheduledEmail(
    projectId: string,
    scheduledId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/email/scheduled/${scheduledId}`
    );
  }

  // Email History
  async getEmailHistory(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: "sent" | "failed" | "bounced" | "delivered";
      recipient?: string;
      template_id?: string;
      sent_after?: string;
      sent_before?: string;
    }
  ): Promise<PaginatedResponse<EmailHistory>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.status) params.append("status", options.status);
    if (options?.recipient) params.append("recipient", options.recipient);
    if (options?.template_id) params.append("template_id", options.template_id);
    if (options?.sent_after) params.append("sent_after", options.sent_after);
    if (options?.sent_before) params.append("sent_before", options.sent_before);

    const url = params.toString()
      ? `/projects/${projectId}/email/history?${params}`
      : `/projects/${projectId}/email/history`;

    return this.getPaginated<EmailHistory>(url);
  }

  async getEmailDetails(
    projectId: string,
    messageId: string
  ): Promise<
    ApiResponse<
      EmailHistory & {
        opens: Array<{
          timestamp: string;
          ip_address?: string;
          user_agent?: string;
        }>;
        clicks: Array<{
          timestamp: string;
          url: string;
          ip_address?: string;
          user_agent?: string;
        }>;
        bounces: Array<{
          timestamp: string;
          reason: string;
          type: "hard" | "soft";
        }>;
        complaints: Array<{ timestamp: string; reason: string }>;
      }
    >
  > {
    return this.get<
      EmailHistory & {
        opens: Array<{
          timestamp: string;
          ip_address?: string;
          user_agent?: string;
        }>;
        clicks: Array<{
          timestamp: string;
          url: string;
          ip_address?: string;
          user_agent?: string;
        }>;
        bounces: Array<{
          timestamp: string;
          reason: string;
          type: "hard" | "soft";
        }>;
        complaints: Array<{ timestamp: string; reason: string }>;
      }
    >(`/projects/${projectId}/email/history/${messageId}`);
  }

  // Email Analytics
  async getEmailAnalytics(
    projectId: string,
    options?: {
      period: "day" | "week" | "month" | "year";
      start_date?: string;
      end_date?: string;
      template_id?: string;
    }
  ): Promise<
    ApiResponse<{
      period: string;
      start_date: string;
      end_date: string;
      total_sent: number;
      total_delivered: number;
      total_bounced: number;
      total_opened: number;
      total_clicked: number;
      total_complained: number;
      delivery_rate: number;
      open_rate: number;
      click_rate: number;
      bounce_rate: number;
      complaint_rate: number;
      daily_stats: Array<{
        date: string;
        sent: number;
        delivered: number;
        bounced: number;
        opened: number;
        clicked: number;
        complained: number;
      }>;
    }>
  > {
    const params = new URLSearchParams();
    if (options?.period) params.append("period", options.period);
    if (options?.start_date) params.append("start_date", options.start_date);
    if (options?.end_date) params.append("end_date", options.end_date);
    if (options?.template_id) params.append("template_id", options.template_id);

    const url = params.toString()
      ? `/projects/${projectId}/email/analytics?${params}`
      : `/projects/${projectId}/email/analytics`;

    return this.get<{
      period: string;
      start_date: string;
      end_date: string;
      total_sent: number;
      total_delivered: number;
      total_bounced: number;
      total_opened: number;
      total_clicked: number;
      total_complained: number;
      delivery_rate: number;
      open_rate: number;
      click_rate: number;
      bounce_rate: number;
      complaint_rate: number;
      daily_stats: Array<{
        date: string;
        sent: number;
        delivered: number;
        bounced: number;
        opened: number;
        clicked: number;
        complained: number;
      }>;
    }>(url);
  }

  // Email Providers
  async getEmailProviders(): Promise<ApiResponse<EmailProvider[]>> {
    return this.get<EmailProvider[]>("/email/providers");
  }

  async testEmailProvider(
    providerId: string,
    testConfig: {
      smtp_host: string;
      smtp_port: number;
      smtp_username: string;
      smtp_password: string;
      smtp_secure: boolean;
      from_email: string;
      to_email: string;
    }
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.post<{ success: boolean; message?: string }>(
      `/email/providers/${providerId}/test`,
      testConfig
    );
  }

  // Email Validation
  async validateEmail(email: string): Promise<
    ApiResponse<{
      valid: boolean;
      format_valid: boolean;
      domain_valid: boolean;
      disposable: boolean;
      role: boolean;
      free_email: boolean;
      suggestions?: string[];
    }>
  > {
    return this.post<{
      valid: boolean;
      format_valid: boolean;
      domain_valid: boolean;
      disposable: boolean;
      role: boolean;
      free_email: boolean;
      suggestions?: string[];
    }>("/email/validate", { email });
  }

  async validateBulkEmails(emails: string[]): Promise<
    ApiResponse<
      Array<{
        email: string;
        valid: boolean;
        format_valid: boolean;
        domain_valid: boolean;
        disposable: boolean;
        role: boolean;
        free_email: boolean;
        suggestions?: string[];
      }>
    >
  > {
    return this.post<
      Array<{
        email: string;
        valid: boolean;
        format_valid: boolean;
        domain_valid: boolean;
        disposable: boolean;
        role: boolean;
        free_email: boolean;
        suggestions?: string[];
      }>
    >("/email/validate-bulk", { emails });
  }
}
