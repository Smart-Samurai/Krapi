"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBroadcastFunction = setBroadcastFunction;
const nodemailer_1 = __importDefault(require("nodemailer"));
const handlebars_1 = __importDefault(require("handlebars"));
const database_1 = __importDefault(require("./database"));
// Import will be available after app.ts exports it
let _broadcastToAll = null;
// Function to set the broadcast function from app.ts
function setBroadcastFunction(fn) {
    _broadcastToAll = fn;
}
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = null;
        this.initializeFromDatabase();
    }
    async initializeFromDatabase() {
        try {
            const settings = database_1.default.getEmailSettings();
            const config = {};
            settings.forEach((setting) => {
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
                        if (!config.auth)
                            config.auth = { user: "", pass: "" };
                        config.auth.user = setting.value;
                        break;
                    case "smtp_pass":
                        if (!config.auth)
                            config.auth = { user: "", pass: "" };
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
            if (config.host &&
                config.port &&
                config.auth?.user &&
                config.auth?.pass &&
                config.from) {
                this.config = config;
                await this.createTransporter();
            }
        }
        catch (error) {
            console.error("Failed to initialize email service from database:", error);
        }
    }
    async createTransporter() {
        if (!this.config) {
            throw new Error("Email configuration not set");
        }
        this.transporter = nodemailer_1.default.createTransport({
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
        }
        catch (error) {
            console.error("Email service verification failed:", error);
            this.transporter = null;
        }
    }
    async updateConfiguration(settings) {
        // Update database settings
        for (const [key, value] of Object.entries(settings)) {
            database_1.default.setEmailSetting(key, value);
        }
        // Reinitialize service
        await this.initializeFromDatabase();
    }
    async sendEmail(request) {
        if (!this.transporter || !this.config) {
            return { success: false, error: "Email service not configured" };
        }
        try {
            let html = request.html;
            let text = request.text;
            let subject = request.subject;
            // If template is specified, load and compile it
            if (request.template_name) {
                const template = database_1.default.getEmailTemplateByName(request.template_name);
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
                const htmlTemplate = handlebars_1.default.compile(template.template_html);
                const textTemplate = template.template_text
                    ? handlebars_1.default.compile(template.template_text)
                    : null;
                const subjectTemplate = handlebars_1.default.compile(template.subject);
                html = htmlTemplate(variables);
                text = textTemplate ? textTemplate(variables) : undefined;
                subject = subjectTemplate(variables);
            }
            const recipients = Array.isArray(request.to) ? request.to : [request.to];
            const results = [];
            // Send to each recipient individually to track delivery
            for (const recipient of recipients) {
                const mailOptions = {
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
                    database_1.default.createEmailLog({
                        template_id: request.template_name
                            ? database_1.default.getEmailTemplateByName(request.template_name)?.id
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
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    // Log failed email to database
                    database_1.default.createEmailLog({
                        template_id: request.template_name
                            ? database_1.default.getEmailTemplateByName(request.template_name)?.id
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
                messageId: successful.length === 1 ? successful[0].messageId : undefined,
                error: failed.length > 0
                    ? `Failed to send to: ${failed.map((f) => f.recipient).join(", ")}`
                    : undefined,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: errorMessage };
        }
    }
    async sendTemplateEmail(templateName, to, variables = {}) {
        return this.sendEmail({
            template_name: templateName,
            to,
            variables,
        });
    }
    async testConnection() {
        if (!this.transporter) {
            return { success: false, error: "Email service not configured" };
        }
        try {
            await this.transporter.verify();
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: errorMessage };
        }
    }
    isConfigured() {
        return this.transporter !== null && this.config !== null;
    }
    getConfiguration() {
        if (!this.config)
            return null;
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
    async getEmailStats(startDate, endDate) {
        return database_1.default.getEmailStats(startDate, endDate);
    }
    async getEmailLogs(page = 1, limit = 50, status) {
        return database_1.default.getEmailLogs(page, limit, status);
    }
    // Template management
    async getTemplates() {
        return database_1.default.getAllEmailTemplates();
    }
    async getTemplate(id) {
        return database_1.default.getEmailTemplateById(id);
    }
    async getTemplateByName(name) {
        return database_1.default.getEmailTemplateByName(name);
    }
    // Utility method to send system notifications
    async sendSystemNotification(type, data) {
        try {
            // Get users who want this type of notification
            const users = database_1.default.getUsersWithNotificationPreference(type);
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
        }
        catch (error) {
            console.error("Failed to send system notification:", error);
        }
    }
}
// Export singleton instance
exports.default = new EmailService();
//# sourceMappingURL=email.js.map