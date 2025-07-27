import KrapiClient, { KrapiResponse } from "./client";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables?: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  template_id: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  content_updates: boolean;
  user_management: boolean;
  system_alerts: boolean;
  marketing_emails: boolean;
}

export class KrapiEmail {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Get email configuration
  async getConfiguration(): Promise<KrapiResponse<Record<string, unknown>>> {
    return this.client.request("email", "config", "get");
  }

  // Get all templates
  async getAllTemplates(): Promise<KrapiResponse<EmailTemplate[]>> {
    return this.client.request("email", "templates", "list");
  }

  // Get email logs
  async getLogs(
    page: number,
    limit: number
  ): Promise<KrapiResponse<EmailLog[]>> {
    return this.client.request("email", "logs", "list", { page, limit });
  }

  // Get email stats
  async getStats(): Promise<KrapiResponse<EmailStats>> {
    return this.client.request("email", "stats", "get");
  }

  // Get notification preferences
  async getPreferences(): Promise<KrapiResponse<NotificationPreferences>> {
    return this.client.request("email", "preferences", "get");
  }

  // Update configuration
  async updateConfiguration(
    config: Record<string, unknown>
  ): Promise<KrapiResponse> {
    return this.client.request("email", "config", "update", config);
  }

  // Test connection
  async testConnection(): Promise<KrapiResponse> {
    return this.client.request("email", "connection", "test");
  }

  // Create template
  async createTemplate(
    template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">
  ): Promise<KrapiResponse<EmailTemplate>> {
    return this.client.request("email", "templates", "create", template);
  }

  // Update template
  async updateTemplate(
    id: string,
    template: Partial<EmailTemplate>
  ): Promise<KrapiResponse<EmailTemplate>> {
    return this.client.request("email", "templates", "update", {
      id,
      ...template,
    });
  }

  // Delete template
  async deleteTemplate(id: string): Promise<KrapiResponse> {
    return this.client.request("email", "templates", "delete", { id });
  }

  // Send email
  async sendEmail(emailData: {
    template_id: string;
    recipient_email: string;
    variables?: Record<string, string>;
  }): Promise<KrapiResponse> {
    return this.client.request("email", "send", "send", emailData);
  }

  // Update preferences
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<KrapiResponse> {
    return this.client.request("email", "preferences", "update", preferences);
  }
}

// Create email instance from client
export function createKrapiEmail(client: KrapiClient): KrapiEmail {
  return new KrapiEmail(client);
}
