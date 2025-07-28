import KrapiClient, { KrapiResponse } from "./client";

export class KrapiEmail {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Send email
  async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    body: string;
    from?: string;
    template?: string;
    variables?: Record<string, unknown>;
  }): Promise<KrapiResponse<{ messageId: string }>> {
    return this.client.request("email", "send", "send", emailData);
  }

  // Send template email
  async sendTemplateEmail(templateData: {
    to: string | string[];
    template: string;
    variables: Record<string, unknown>;
    from?: string;
  }): Promise<KrapiResponse<{ messageId: string }>> {
    return this.client.request("email", "template", "send", templateData);
  }

  // Get email templates
  async getTemplates(): Promise<
    KrapiResponse<
      Array<{
        id: string;
        name: string;
        subject: string;
        body: string;
        variables: string[];
        created_at: string;
        updated_at: string;
      }>
    >
  > {
    return this.client.request("email", "templates", "list");
  }

  // Create email template
  async createTemplate(templateData: {
    name: string;
    subject: string;
    body: string;
    variables?: string[];
  }): Promise<
    KrapiResponse<{
      id: string;
      name: string;
      subject: string;
      body: string;
      variables: string[];
      created_at: string;
      updated_at: string;
    }>
  > {
    return this.client.request("email", "templates", "create", templateData);
  }

  // Update email template
  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      subject: string;
      body: string;
      variables: string[];
    }>
  ): Promise<
    KrapiResponse<{
      id: string;
      name: string;
      subject: string;
      body: string;
      variables: string[];
      created_at: string;
      updated_at: string;
    }>
  > {
    return this.client.request("email", "templates", "update", {
      templateId,
      ...updates,
    });
  }

  // Delete email template
  async deleteTemplate(templateId: string): Promise<KrapiResponse> {
    return this.client.request("email", "templates", "delete", { templateId });
  }

  // Get email logs
  async getEmailLogs(params?: {
    limit?: number;
    offset?: number;
    status?: "sent" | "failed" | "pending";
    from?: string;
    to?: string;
  }): Promise<
    KrapiResponse<
      Array<{
        id: string;
        to: string;
        from: string;
        subject: string;
        status: "sent" | "failed" | "pending";
        sent_at?: string;
        error?: string;
        created_at: string;
      }>
    >
  > {
    return this.client.request("email", "logs", "list", params);
  }

  // Get email statistics
  async getEmailStats(): Promise<
    KrapiResponse<{
      total_sent: number;
      total_failed: number;
      success_rate: number;
      average_delivery_time: number;
      top_templates: Array<{
        template_id: string;
        name: string;
        sent_count: number;
      }>;
    }>
  > {
    return this.client.request("email", "stats", "get");
  }

  // Verify email address
  async verifyEmail(email: string): Promise<
    KrapiResponse<{
      valid: boolean;
      reason?: string;
    }>
  > {
    return this.client.request("email", "verify", "check", { email });
  }

  // Health check for email service
  async health(): Promise<
    KrapiResponse<{
      status: string;
      provider: string;
      quota_remaining?: number;
    }>
  > {
    return this.client.request("email", "health", "check");
  }
}

// Create email instance from client
export function createKrapiEmail(client: KrapiClient): KrapiEmail {
  return new KrapiEmail(client);
}
