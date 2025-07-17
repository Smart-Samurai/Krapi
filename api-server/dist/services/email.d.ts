import { EmailSendRequest, EmailTemplate, EmailLog } from "../types";
export declare function setBroadcastFunction(fn: (_message: Record<string, unknown>) => void): void;
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
declare class EmailService {
    private transporter;
    private config;
    constructor();
    private initializeFromDatabase;
    private createTransporter;
    updateConfiguration(settings: Record<string, string>): Promise<void>;
    sendEmail(request: EmailSendRequest): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    sendTemplateEmail(templateName: string, to: string | string[], variables?: Record<string, unknown>): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    isConfigured(): boolean;
    getConfiguration(): Partial<EmailConfig> | null;
    getEmailStats(startDate?: string, endDate?: string): Promise<{
        total: number;
        sent: number;
        failed: number;
        opened: number;
        clicked: number;
        bounced: number;
    }>;
    getEmailLogs(page?: number, limit?: number, status?: string): Promise<{
        logs: EmailLog[];
        total: number;
        page: number;
        limit: number;
    }>;
    getTemplates(): Promise<EmailTemplate[]>;
    getTemplate(id: number): Promise<EmailTemplate | null>;
    getTemplateByName(name: string): Promise<EmailTemplate | null>;
    sendSystemNotification(type: "user_created" | "content_updated" | "system_alert", data: Record<string, unknown>): Promise<void>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.d.ts.map