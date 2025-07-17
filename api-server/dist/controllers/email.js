"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const email_1 = __importDefault(require("../services/email"));
const database_1 = __importDefault(require("../services/database"));
class EmailController {
    // Email configuration management
    static async getEmailConfiguration(req, res) {
        try {
            const config = email_1.default.getConfiguration();
            const isConfigured = email_1.default.isConfigured();
            const response = {
                success: true,
                data: {
                    configuration: config,
                    isConfigured,
                },
                message: "Email configuration retrieved successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get email configuration error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve email configuration",
            };
            res.status(500).json(response);
        }
    }
    static async updateEmailConfiguration(req, res) {
        try {
            const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, smtp_reply_to, } = req.body;
            if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !smtp_from) {
                const response = {
                    success: false,
                    error: "SMTP host, port, user, password, and from address are required",
                };
                res.status(400).json(response);
                return;
            }
            const settings = {
                smtp_host,
                smtp_port: smtp_port.toString(),
                smtp_secure: smtp_secure ? "true" : "false",
                smtp_user,
                smtp_pass,
                smtp_from,
                smtp_reply_to: smtp_reply_to || "",
            };
            await email_1.default.updateConfiguration(settings);
            const response = {
                success: true,
                message: "Email configuration updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update email configuration error:", error);
            const response = {
                success: false,
                error: "Failed to update email configuration",
            };
            res.status(500).json(response);
        }
    }
    static async testEmailConnection(req, res) {
        try {
            const result = await email_1.default.testConnection();
            const response = {
                success: result.success,
                message: result.success
                    ? "Email connection test successful"
                    : "Email connection test failed",
                error: result.error,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            console.error("Test email connection error:", error);
            const response = {
                success: false,
                error: "Failed to test email connection",
            };
            res.status(500).json(response);
        }
    }
    // Send email
    static async sendEmail(req, res) {
        try {
            const emailRequest = req.body;
            if (!emailRequest.to) {
                const response = {
                    success: false,
                    error: "Recipient email address is required",
                };
                res.status(400).json(response);
                return;
            }
            const result = await email_1.default.sendEmail(emailRequest);
            const response = {
                success: result.success,
                data: result.messageId ? { messageId: result.messageId } : undefined,
                message: result.success
                    ? "Email sent successfully"
                    : "Failed to send email",
                error: result.error,
            };
            res.status(result.success ? 200 : 400).json(response);
        }
        catch (error) {
            console.error("Send email error:", error);
            const response = {
                success: false,
                error: "Failed to send email",
            };
            res.status(500).json(response);
        }
    }
    // Email template management
    static async getAllTemplates(req, res) {
        try {
            const templates = await email_1.default.getTemplates();
            const response = {
                success: true,
                data: templates,
                message: `Retrieved ${templates.length} email templates`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get all templates error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve email templates",
            };
            res.status(500).json(response);
        }
    }
    static async getTemplateById(req, res) {
        try {
            const { id } = req.params;
            const templateId = parseInt(id);
            if (isNaN(templateId)) {
                const response = {
                    success: false,
                    error: "Invalid template ID",
                };
                res.status(400).json(response);
                return;
            }
            const template = await email_1.default.getTemplate(templateId);
            if (!template) {
                const response = {
                    success: false,
                    error: `Template with ID ${templateId} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: template,
                message: `Retrieved template '${template.name}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get template by ID error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve email template",
            };
            res.status(500).json(response);
        }
    }
    static async createTemplate(req, res) {
        try {
            const templateData = req.body;
            if (!templateData.name ||
                !templateData.subject ||
                !templateData.template_html) {
                const response = {
                    success: false,
                    error: "Template name, subject, and HTML template are required",
                };
                res.status(400).json(response);
                return;
            }
            const template = database_1.default.createEmailTemplate({
                name: templateData.name,
                subject: templateData.subject,
                template_html: templateData.template_html,
                template_text: templateData.template_text,
                variables: templateData.variables || [],
                description: templateData.description,
                active: templateData.active ?? true,
            });
            const response = {
                success: true,
                data: template,
                message: `Template '${template.name}' created successfully`,
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error("Create template error:", error);
            if (error instanceof Error &&
                error.message.includes("UNIQUE constraint")) {
                const response = {
                    success: false,
                    error: "A template with this name already exists",
                };
                res.status(409).json(response);
            }
            else {
                const response = {
                    success: false,
                    error: "Failed to create email template",
                };
                res.status(500).json(response);
            }
        }
    }
    static async updateTemplate(req, res) {
        try {
            const { id } = req.params;
            const templateId = parseInt(id);
            const updates = req.body;
            if (isNaN(templateId)) {
                const response = {
                    success: false,
                    error: "Invalid template ID",
                };
                res.status(400).json(response);
                return;
            }
            const updatedTemplate = database_1.default.updateEmailTemplate(templateId, updates);
            if (!updatedTemplate) {
                const response = {
                    success: false,
                    error: `Template with ID ${templateId} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: updatedTemplate,
                message: `Template '${updatedTemplate.name}' updated successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update template error:", error);
            const response = {
                success: false,
                error: "Failed to update email template",
            };
            res.status(500).json(response);
        }
    }
    static async deleteTemplate(req, res) {
        try {
            const { id } = req.params;
            const templateId = parseInt(id);
            if (isNaN(templateId)) {
                const response = {
                    success: false,
                    error: "Invalid template ID",
                };
                res.status(400).json(response);
                return;
            }
            const deleted = database_1.default.deleteEmailTemplate(templateId);
            if (!deleted) {
                const response = {
                    success: false,
                    error: `Template with ID ${templateId} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: "Email template deleted successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete template error:", error);
            const response = {
                success: false,
                error: "Failed to delete email template",
            };
            res.status(500).json(response);
        }
    }
    // Email logs and analytics
    static async getEmailLogs(req, res) {
        try {
            const { page = "1", limit = "50", status } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            if (isNaN(pageNum) || pageNum < 1) {
                const response = {
                    success: false,
                    error: "Invalid page number",
                };
                res.status(400).json(response);
                return;
            }
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                const response = {
                    success: false,
                    error: "Limit must be between 1 and 100",
                };
                res.status(400).json(response);
                return;
            }
            const result = await email_1.default.getEmailLogs(pageNum, limitNum, status);
            const response = {
                success: true,
                data: result,
                message: `Retrieved ${result.logs.length} email logs`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get email logs error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve email logs",
            };
            res.status(500).json(response);
        }
    }
    static async getEmailStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const stats = await email_1.default.getEmailStats(startDate, endDate);
            const response = {
                success: true,
                data: stats,
                message: "Email statistics retrieved successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get email stats error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve email statistics",
            };
            res.status(500).json(response);
        }
    }
    // Notification preferences
    static async getNotificationPreferences(req, res) {
        try {
            const userId = req.user?.userId || 0;
            const preferences = database_1.default.getNotificationPreferences(userId);
            const response = {
                success: true,
                data: preferences || {
                    user_id: userId,
                    email_notifications: true,
                    content_updates: true,
                    user_management: true,
                    system_alerts: true,
                    marketing_emails: false,
                },
                message: "Notification preferences retrieved successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get notification preferences error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve notification preferences",
            };
            res.status(500).json(response);
        }
    }
    static async updateNotificationPreferences(req, res) {
        try {
            const userId = req.user?.userId || 0;
            const { email_notifications, content_updates, user_management, system_alerts, marketing_emails, } = req.body;
            const preferences = database_1.default.setNotificationPreferences({
                user_id: userId,
                email_notifications: email_notifications ?? true,
                content_updates: content_updates ?? true,
                user_management: user_management ?? true,
                system_alerts: system_alerts ?? true,
                marketing_emails: marketing_emails ?? false,
            });
            const response = {
                success: true,
                data: preferences,
                message: "Notification preferences updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update notification preferences error:", error);
            const response = {
                success: false,
                error: "Failed to update notification preferences",
            };
            res.status(500).json(response);
        }
    }
}
exports.EmailController = EmailController;
//# sourceMappingURL=email.js.map