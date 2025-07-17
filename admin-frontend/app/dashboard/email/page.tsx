"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Settings,
  FileText,
  BarChart3,
  Send,
  Plus,
  Edit,
  Trash2,
  Eye,
  TestTube,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { emailAPI } from "@/lib/api";
import {
  EmailTemplate,
  EmailLog,
  EmailStats,
  NotificationPreferences,
} from "@/types";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";

// Validation schemas
const emailConfigSchema = z.object({
  smtp_host: z.string().min(1, "SMTP host is required"),
  smtp_port: z
    .number()
    .min(1, "SMTP port is required")
    .max(65535, "Invalid port"),
  smtp_secure: z.boolean(),
  smtp_user: z.string().min(1, "SMTP username is required"),
  smtp_pass: z.string().min(1, "SMTP password is required"),
  smtp_from: z.string().email("Invalid from email address"),
  smtp_reply_to: z
    .string()
    .email("Invalid reply-to email address")
    .optional()
    .or(z.literal("")),
});

const emailTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Name too long"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject too long"),
  template_html: z.string().min(1, "HTML template is required"),
  template_text: z.string().optional(),
  description: z.string().optional(),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

const sendEmailSchema = z.object({
  to: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required").optional(),
  template_name: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  variables: z.string().optional(),
});

type TabType = "config" | "templates" | "send" | "logs" | "preferences";
type EmailConfigFormData = z.infer<typeof emailConfigSchema>;
type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
type SendEmailFormData = z.infer<typeof sendEmailSchema>;

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>("config");
  const [loading, setLoading] = useState(true);

  // Configuration state
  const [isConfigured, setIsConfigured] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsStatus, setLogsStatus] = useState<string>("");

  // Stats state
  const [stats, setStats] = useState<EmailStats | null>(null);

  // Preferences state
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const { handleError, showSuccess } = useNotification();

  // Forms
  const configForm = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigSchema),
  });

  const templateForm = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      active: true,
      variables: [],
    },
  });

  const sendEmailForm = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
  });

  // Load data
  const loadConfiguration = useCallback(async () => {
    try {
      const response = await emailAPI.getConfiguration();
      if (response.success) {
        setIsConfigured(response.data.isConfigured);

        if (response.data.configuration) {
          configForm.reset({
            smtp_host: response.data.configuration.host || "",
            smtp_port: response.data.configuration.port || 587,
            smtp_secure: response.data.configuration.secure || false,
            smtp_user: response.data.configuration.auth?.user || "",
            smtp_pass: "", // Don't prefill password
            smtp_from: response.data.configuration.from || "",
            smtp_reply_to: response.data.configuration.replyTo || "",
          });
        }
      }
    } catch (error) {
      handleError(error, "Failed to load email configuration");
    }
  }, [configForm, handleError]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await emailAPI.getAllTemplates();
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      handleError(error, "Failed to load email templates");
    }
  }, [handleError]);

  const loadLogs = useCallback(async () => {
    try {
      const response = await emailAPI.getLogs(
        logsPage,
        20,
        logsStatus || undefined
      );
      if (response.success) {
        setLogs(response.data.logs);
        setLogsTotal(response.data.total);
      }
    } catch (error) {
      handleError(error, "Failed to load email logs");
    }
  }, [logsPage, logsStatus, handleError]);

  const loadStats = useCallback(async () => {
    try {
      const response = await emailAPI.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      handleError(error, "Failed to load email statistics");
    }
  }, [handleError]);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await emailAPI.getPreferences();
      if (response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      handleError(error, "Failed to load notification preferences");
    }
  }, [handleError]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadConfiguration(),
        loadTemplates(),
        loadStats(),
        loadPreferences(),
      ]);
      if (activeTab === "logs") {
        await loadLogs();
      }
      setLoading(false);
    };

    loadData();
  }, [
    activeTab,
    loadConfiguration,
    loadTemplates,
    loadStats,
    loadPreferences,
    loadLogs,
  ]);

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [activeTab, logsPage, logsStatus, loadLogs]);

  // Handlers
  const handleUpdateConfiguration = async (data: EmailConfigFormData) => {
    try {
      const response = await emailAPI.updateConfiguration(data);
      if (response.success) {
        showSuccess("Email configuration updated successfully");
        await loadConfiguration();
      } else {
        handleError(response.error || "Failed to update configuration");
      }
    } catch (error) {
      handleError(error, "Failed to update email configuration");
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await emailAPI.testConnection();
      if (response.success) {
        showSuccess("Email connection test successful");
      } else {
        handleError(response.error || "Email connection test failed");
      }
    } catch (error) {
      handleError(error, "Failed to test email connection");
    }
  };

  const handleCreateTemplate = async (data: EmailTemplateFormData) => {
    try {
      const response = await emailAPI.createTemplate(data);
      if (response.success) {
        showSuccess("Email template created successfully");
        setShowTemplateModal(false);
        templateForm.reset();
        await loadTemplates();
      } else {
        handleError(response.error || "Failed to create template");
      }
    } catch (error) {
      handleError(error, "Failed to create email template");
    }
  };

  const handleUpdateTemplate = async (data: EmailTemplateFormData) => {
    if (!editingTemplate) return;

    try {
      const response = await emailAPI.updateTemplate(editingTemplate.id, data);
      if (response.success) {
        showSuccess("Email template updated successfully");
        setShowTemplateModal(false);
        setEditingTemplate(null);
        templateForm.reset();
        await loadTemplates();
      } else {
        handleError(response.error || "Failed to update template");
      }
    } catch (error) {
      handleError(error, "Failed to update email template");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await emailAPI.deleteTemplate(id);
      if (response.success) {
        showSuccess("Email template deleted successfully");
        await loadTemplates();
      } else {
        handleError(response.error || "Failed to delete template");
      }
    } catch (error) {
      handleError(error, "Failed to delete email template");
    }
  };

  const handleSendEmail = async (data: SendEmailFormData) => {
    try {
      let variables: Record<string, unknown> = {};
      if (data.variables) {
        try {
          variables = JSON.parse(data.variables);
        } catch {
          handleError("Invalid JSON in variables field");
          return;
        }
      }

      const emailData = {
        to: data.to.split(",").map((email) => email.trim()),
        template_name: data.template_name || undefined,
        subject: data.subject,
        html: data.html,
        text: data.text,
        variables,
      };

      const response = await emailAPI.sendEmail(emailData);
      if (response.success) {
        showSuccess("Email sent successfully");
        sendEmailForm.reset();
        if (activeTab === "logs") {
          await loadLogs();
        }
      } else {
        handleError(response.error || "Failed to send email");
      }
    } catch (error) {
      handleError(error, "Failed to send email");
    }
  };

  const handleUpdatePreferences = async (
    updates: Partial<NotificationPreferences>
  ) => {
    try {
      const response = await emailAPI.updatePreferences(updates);
      if (response.success) {
        showSuccess("Notification preferences updated successfully");
        setPreferences(response.data);
      } else {
        handleError(response.error || "Failed to update preferences");
      }
    } catch (error) {
      handleError(error, "Failed to update notification preferences");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "opened":
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const openTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      templateForm.reset({
        name: template.name,
        subject: template.subject,
        template_html: template.template_html,
        template_text: template.template_text || "",
        description: template.description || "",
        variables: template.variables,
        active: template.active,
      });
    } else {
      setEditingTemplate(null);
      templateForm.reset({
        active: true,
        variables: [],
      });
    }
    setShowTemplateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading email management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Mail className="h-8 w-8 mr-3 text-blue-600" />
            Email Management
          </h1>
          <p className="text-gray-600 mt-2">
            Configure SMTP settings, manage email templates, and monitor email
            delivery
          </p>
        </div>

        {/* Status indicator */}
        <div className="mb-6">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isConfigured
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isConfigured ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Email service configured
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Email service not configured
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: "config", label: "Configuration", icon: Settings },
              { key: "templates", label: "Templates", icon: FileText },
              { key: "send", label: "Send Email", icon: Send },
              { key: "logs", label: "Logs", icon: BarChart3 },
              { key: "preferences", label: "Preferences", icon: Bell },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`${
                  activeTab === key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "config" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">SMTP Configuration</h2>
              <button
                onClick={handleTestConnection}
                disabled={!isConfigured}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </button>
            </div>

            <form
              onSubmit={configForm.handleSubmit(handleUpdateConfiguration)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Host *
                  </label>
                  <input
                    {...configForm.register("smtp_host")}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="smtp.gmail.com"
                  />
                  {configForm.formState.errors.smtp_host && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_host.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Port *
                  </label>
                  <input
                    {...configForm.register("smtp_port", {
                      valueAsNumber: true,
                    })}
                    type="number"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="587"
                  />
                  {configForm.formState.errors.smtp_port && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_port.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username *
                  </label>
                  <input
                    {...configForm.register("smtp_user")}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your-email@domain.com"
                  />
                  {configForm.formState.errors.smtp_user && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_user.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    {...configForm.register("smtp_pass")}
                    type="password"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                  {configForm.formState.errors.smtp_pass && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_pass.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    From Email *
                  </label>
                  <input
                    {...configForm.register("smtp_from")}
                    type="email"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="noreply@yourdomain.com"
                  />
                  {configForm.formState.errors.smtp_from && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_from.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reply-To Email
                  </label>
                  <input
                    {...configForm.register("smtp_reply_to")}
                    type="email"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="support@yourdomain.com"
                  />
                  {configForm.formState.errors.smtp_reply_to && (
                    <p className="mt-1 text-sm text-red-600">
                      {configForm.formState.errors.smtp_reply_to.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  {...configForm.register("smtp_secure")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Use SSL/TLS (recommended for port 465)
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Email Templates</h2>
                <button
                  onClick={() => openTemplateModal()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {templates.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No templates
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first email template.
                  </p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.subject}
                        </p>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              template.active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {template.active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs text-gray-500">
                            Variables: {template.variables.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openTemplateModal(template)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "send" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Send Email</h2>

            <form
              onSubmit={sendEmailForm.handleSubmit(handleSendEmail)}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Recipients *
                </label>
                <input
                  {...sendEmailForm.register("to")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="recipient@example.com, another@example.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Separate multiple email addresses with commas
                </p>
                {sendEmailForm.formState.errors.to && (
                  <p className="mt-1 text-sm text-red-600">
                    {sendEmailForm.formState.errors.to.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Template (Optional)
                </label>
                <select
                  {...sendEmailForm.register("template_name")}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">
                    Select a template (or compose manually)
                  </option>
                  {templates
                    .filter((t) => t.active)
                    .map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name} - {template.subject}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  {...sendEmailForm.register("subject")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email subject (or use template)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HTML Content
                </label>
                <textarea
                  {...sendEmailForm.register("html")}
                  rows={8}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter HTML content (or use template)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Template Variables (JSON)
                </label>
                <textarea
                  {...sendEmailForm.register("variables")}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder='{"variable1": "value1", "variable2": "value2"}'
                />
                <p className="mt-1 text-sm text-gray-500">
                  JSON object with variables to substitute in the template
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isConfigured}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Email Logs</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={logsStatus}
                    onChange={(e) => setLogsStatus(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </div>
              </div>
            </div>

            {stats && (
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.sent}
                    </div>
                    <div className="text-sm text-gray-500">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.failed}
                    </div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.opened}
                    </div>
                    <div className="text-sm text-gray-500">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.clicked}
                    </div>
                    <div className="text-sm text-gray-500">Clicked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.bounced}
                    </div>
                    <div className="text-sm text-gray-500">Bounced</div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(log.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.recipient_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.sent_at
                          ? new Date(log.sent_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {log.error_message || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div className="p-8 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No email logs
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Email logs will appear here once you start sending emails.
                </p>
              </div>
            )}

            {/* Pagination */}
            {logsTotal > 20 && (
              <div className="px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(logsPage - 1) * 20 + 1} to{" "}
                    {Math.min(logsPage * 20, logsTotal)} of {logsTotal} logs
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                      disabled={logsPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setLogsPage(logsPage + 1)}
                      disabled={logsPage * 20 >= logsTotal}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "preferences" && preferences && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">
              Notification Preferences
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Email Notifications
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive email notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      email_notifications: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Content Updates
                  </h3>
                  <p className="text-sm text-gray-500">
                    Notifications when content is created or updated
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.content_updates}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      content_updates: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    User Management
                  </h3>
                  <p className="text-sm text-gray-500">
                    Notifications when users are created, updated, or deleted
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.user_management}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      user_management: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    System Alerts
                  </h3>
                  <p className="text-sm text-gray-500">
                    Critical system alerts and errors
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.system_alerts}
                  onChange={(e) =>
                    handleUpdatePreferences({ system_alerts: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Marketing Emails
                  </h3>
                  <p className="text-sm text-gray-500">
                    Product updates and marketing communications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing_emails}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      marketing_emails: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingTemplate ? "Edit Template" : "Create Template"}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={templateForm.handleSubmit(
                editingTemplate ? handleUpdateTemplate : handleCreateTemplate
              )}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Template Name *
                </label>
                <input
                  {...templateForm.register("name")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {templateForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {templateForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject *
                </label>
                <input
                  {...templateForm.register("subject")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {templateForm.formState.errors.subject && (
                  <p className="mt-1 text-sm text-red-600">
                    {templateForm.formState.errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HTML Template *
                </label>
                <textarea
                  {...templateForm.register("template_html")}
                  rows={8}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {templateForm.formState.errors.template_html && (
                  <p className="mt-1 text-sm text-red-600">
                    {templateForm.formState.errors.template_html.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Text Template
                </label>
                <textarea
                  {...templateForm.register("template_text")}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  {...templateForm.register("description")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  {...templateForm.register("active")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active template
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingTemplate ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
