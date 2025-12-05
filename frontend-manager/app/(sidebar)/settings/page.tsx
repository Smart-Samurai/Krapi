/**
 * System Settings Page
 *
 * Page for managing system-wide settings including general, security, email, and database configuration.
 * Provides settings management and email testing functionality.
 *
 * @module app/(sidebar)/settings/page
 * @example
 * // Automatically rendered at /settings route
 */
"use client";

import { Settings, Shield, Save, RefreshCw, Mail, Database, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { PageLayout, PageHeader, ActionButton } from "@/components/common";
import { Form, FormField } from "@/components/forms";
import {
  generalSettingsSchema,
  securitySettingsSchema,
  emailSettingsSchema,
  databaseSettingsSchema,
  useSettings,
} from "@/components/settings";
import { InfoBlock } from "@/components/styled/InfoBlock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Tab configuration
 */
const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "security", label: "Security", icon: Shield },
  { id: "email", label: "Email", icon: Mail },
  { id: "database", label: "Database", icon: Database },
];

/**
 * System Settings Page Component
 *
 * Provides system settings management interface with tabs.
 *
 * @returns {JSX.Element} Settings page
 */
export default function SettingsPage() {
  const {
    activeTab,
    setActiveTab,
    isLoading,
    isSaving,
    settings,
    testEmailDialog,
    setTestEmailDialog,
    testEmail,
    setTestEmail,
    handleGeneralSubmit,
    handleSecuritySubmit,
    handleEmailSubmit,
    handleDatabaseSubmit,
    handleTestEmail,
  } = useSettings();

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text/60">Failed to load settings</p>
      </div>
    );
  }

  return (
    <PageLayout className="max-w-6xl mx-auto">
      <PageHeader
        title="System Settings"
        description="Manage your KRAPI instance configuration"
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-1 py-4 border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-text/60 hover:text-text"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* General Settings */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <InfoBlock variant="info">
              <p>
                General settings affect how your KRAPI instance appears and
                behaves.
              </p>
            </InfoBlock>

            <Form
              schema={generalSettingsSchema}
              onSubmit={handleGeneralSubmit}
              defaultValues={settings.general}
            >
              <div className="space-y-6">
                <FormField
                  name="siteName"
                  label="Site Name"
                  type="text"
                  description="The name of your KRAPI instance"
                />
                <FormField
                  name="siteUrl"
                  label="Site URL"
                  type="text"
                  description="The public URL of your KRAPI instance"
                />
                <FormField
                  name="adminEmail"
                  label="Admin Email"
                  type="email"
                  description="Primary contact email for system notifications"
                />
                <FormField
                  name="timezone"
                  label="Timezone"
                  type="select"
                  options={[
                    { value: "UTC", label: "UTC" },
                    { value: "America/New_York", label: "Eastern Time" },
                    { value: "America/Chicago", label: "Central Time" },
                    { value: "America/Denver", label: "Mountain Time" },
                    { value: "America/Los_Angeles", label: "Pacific Time" },
                  ]}
                  description="Default timezone for the system"
                />
                <FormField
                  name="defaultLanguage"
                  label="Default Language"
                  type="select"
                  options={[
                    { value: "en", label: "English" },
                    { value: "es", label: "Spanish" },
                    { value: "fr", label: "French" },
                    { value: "de", label: "German" },
                  ]}
                  description="Default language for the interface"
                />
                <div className="flex justify-end">
                  <ActionButton variant="default" icon={Save} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </ActionButton>
                </div>
              </div>
            </Form>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <InfoBlock variant="warning">
              <p>
                Security settings help protect your KRAPI instance from
                unauthorized access.
              </p>
            </InfoBlock>

            <Form
              schema={securitySettingsSchema}
              onSubmit={handleSecuritySubmit}
              defaultValues={settings.security}
            >
              <div className="space-y-6">
                <FormField
                  name="requireTwoFactor"
                  label="Require Two-Factor Authentication"
                  type="checkbox"
                  description="Require all admin users to enable 2FA"
                />
                <FormField
                  name="sessionTimeout"
                  label="Session Timeout (minutes)"
                  type="number"
                  description="How long before inactive sessions expire"
                />
                <FormField
                  name="maxLoginAttempts"
                  label="Max Login Attempts"
                  type="number"
                  description="Maximum failed login attempts before account lockout"
                />

                <div className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold mb-4">
                    Password Requirements
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      name="passwordMinLength"
                      label="Minimum Password Length"
                      type="number"
                      description="Minimum number of characters required"
                    />
                    <FormField
                      name="passwordRequireUppercase"
                      label="Require Uppercase Letters"
                      type="checkbox"
                      description="Passwords must contain at least one uppercase letter"
                    />
                    <FormField
                      name="passwordRequireNumbers"
                      label="Require Numbers"
                      type="checkbox"
                      description="Passwords must contain at least one number"
                    />
                    <FormField
                      name="passwordRequireSymbols"
                      label="Require Symbols"
                      type="checkbox"
                      description="Passwords must contain at least one special character"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold mb-4">
                    Network & Access Control
                  </h3>

                  {settings.security.networkInterface === "0.0.0.0" && (
                    <InfoBlock variant="warning" className="mb-4">
                      <p className="font-semibold">⚠️ Security Warning</p>
                      <p>
                        Listening on 0.0.0.0 exposes your server to all network
                        interfaces. Make sure you have:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Proper firewall rules configured</li>
                        <li>HTTPS enabled for production</li>
                        <li>Strong authentication enabled</li>
                        <li>Allowed Origins configured below</li>
                      </ul>
                    </InfoBlock>
                  )}

                  <div className="space-y-4">
                    <FormField
                      name="networkInterface"
                      label="Network Interface"
                      type="select"
                      options={[
                        { value: "localhost", label: "localhost (Local Only)" },
                        { value: "0.0.0.0", label: "0.0.0.0 (All Interfaces)" },
                      ]}
                      description="Network interface to listen on. Use 0.0.0.0 to allow network access (requires restart and proper security configuration)"
                    />
                    <FormField
                      name="allowedOrigins"
                      label="Allowed Origins (CORS)"
                      type="text"
                      description="Comma-separated list of allowed origins (e.g., https://yourdomain.com,https://app.yourdomain.com). Leave empty to allow all origins."
                      placeholder="https://yourdomain.com,https://app.yourdomain.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <ActionButton variant="default" icon={Save} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </ActionButton>
                </div>
              </div>
            </Form>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === "email" && (
          <div className="space-y-6">
            <InfoBlock variant="info">
              <p>
                Configure email settings for system notifications and user
                communications.
              </p>
            </InfoBlock>

            <Form
              schema={emailSettingsSchema}
              onSubmit={handleEmailSubmit}
              defaultValues={settings.email}
            >
              <div className="space-y-6">
                <FormField
                  name="smtpHost"
                  label="SMTP Host"
                  type="text"
                  description="Your email server hostname"
                />
                <FormField
                  name="smtpPort"
                  label="SMTP Port"
                  type="number"
                  description="Usually 587 for TLS or 465 for SSL"
                />
                <FormField
                  name="smtpUsername"
                  label="SMTP Username"
                  type="text"
                  description="Authentication username for SMTP"
                />
                <FormField
                  name="smtpPassword"
                  label="SMTP Password"
                  type="password"
                  description="Authentication password for SMTP"
                  placeholder="Leave blank to keep current password"
                />
                <FormField
                  name="smtpSecure"
                  label="Use Secure Connection (TLS/SSL)"
                  type="checkbox"
                  description="Enable secure email transmission"
                />

                <div className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold mb-4">
                    Sender Information
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      name="fromEmail"
                      label="From Email"
                      type="email"
                      description="Email address that will appear as sender"
                    />
                    <FormField
                      name="fromName"
                      label="From Name"
                      type="text"
                      description="Name that will appear as sender"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTestEmailDialog(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                  <Button type="submit" className="btn-confirm" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        )}

        {/* Database Settings */}
        {activeTab === "database" && (
          <div className="space-y-6">
            <InfoBlock variant="warning">
              <p>
                Database settings affect performance and data retention. Change
                with caution.
              </p>
            </InfoBlock>

            <Form
              schema={databaseSettingsSchema}
              onSubmit={handleDatabaseSubmit}
              defaultValues={settings.database}
            >
              <div className="space-y-6">
                <FormField
                  name="connectionPoolSize"
                  label="Connection Pool Size"
                  type="number"
                  description="Maximum number of database connections"
                />
                <FormField
                  name="queryTimeout"
                  label="Query Timeout (ms)"
                  type="number"
                  description="Maximum time for database queries"
                />
                <FormField
                  name="enableQueryLogging"
                  label="Enable Query Logging"
                  type="checkbox"
                  description="Log all database queries (may impact performance)"
                />

                <div className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold mb-4">
                    Backup Settings
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      name="backupSchedule"
                      label="Backup Schedule"
                      type="select"
                      options={[
                        { value: "disabled", label: "Disabled" },
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ]}
                      description="How often to create automatic backups"
                    />
                    <FormField
                      name="backupRetentionDays"
                      label="Backup Retention (days)"
                      type="number"
                      description="How long to keep backups before deletion"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <ActionButton variant="default" icon={Save} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </ActionButton>
                </div>
              </div>
            </Form>
          </div>
        )}
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify your email configuration is working
              correctly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Recipient Email</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestEmail} disabled={isSaving || !testEmail}>
              {isSaving ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Database Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset All Database Data</DialogTitle>
            <DialogDescription>
              This will permanently delete ALL data from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <InfoBlock variant="error">
              <p className="font-semibold">⚠️ Final Warning</p>
              <p>
                Type <strong>RESET</strong> in the field below to confirm you want to delete all data.
              </p>
            </InfoBlock>
            <div className="space-y-2">
              <Label htmlFor="resetConfirm">Confirmation</Label>
              <Input
                id="resetConfirm"
                type="text"
                placeholder="Type RESET to confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                data-testid="reset-database-confirm-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetDialogOpen(false);
              setResetConfirmText("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (resetConfirmText !== "RESET") {
                  return;
                }

                setIsResetting(true);
                try {
                  const token = localStorage.getItem("authToken");
                  if (!token) {
                    throw new Error("Authentication required");
                  }

                  const response = await fetch("/api/krapi/k1/system/reset-database", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: "Reset failed" }));
                    throw new Error(error.error || "Failed to reset database");
                  }

                  const result = await response.json();
                  
                  // Show success message
                  alert(`Database reset successfully!\n\nDeleted:\n- ${result.data.deletedProjects} projects\n- ${result.data.deletedAdminUsers} admin users\n- ${result.data.deletedSessions} sessions\n\nYou will be logged out and redirected to login.`);

                  // Clear auth and redirect to login
                  localStorage.removeItem("authToken");
                  window.location.href = "/login";
                } catch (error) {
                  alert(`Failed to reset database: ${error instanceof Error ? error.message : "Unknown error"}`);
                } finally {
                  setIsResetting(false);
                  setResetDialogOpen(false);
                  setResetConfirmText("");
                }
              }}
              disabled={isResetting || resetConfirmText !== "RESET"}
              data-testid="reset-database-confirm-button"
            >
              {isResetting ? "Resetting..." : "Reset Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Database Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset All Database Data</DialogTitle>
            <DialogDescription>
              This will permanently delete ALL data from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <InfoBlock variant="error">
              <p className="font-semibold">⚠️ Final Warning</p>
              <p>
                Type <strong>RESET</strong> in the field below to confirm you want to delete all data.
              </p>
            </InfoBlock>
            <div className="space-y-2">
              <Label htmlFor="resetConfirm">Confirmation</Label>
              <Input
                id="resetConfirm"
                type="text"
                placeholder="Type RESET to confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                data-testid="reset-database-confirm-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetDialogOpen(false);
              setResetConfirmText("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (resetConfirmText !== "RESET") {
                  return;
                }

                setIsResetting(true);
                try {
                  const token = localStorage.getItem("authToken");
                  if (!token) {
                    throw new Error("Authentication required");
                  }

                  const response = await fetch("/api/krapi/k1/system/reset-database", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: "Reset failed" }));
                    throw new Error(error.error || "Failed to reset database");
                  }

                  const result = await response.json();
                  
                  // Show success message
                  alert(`Database reset successfully!\n\nDeleted:\n- ${result.data.deletedProjects} projects\n- ${result.data.deletedAdminUsers} admin users\n- ${result.data.deletedSessions} sessions\n\nYou will be logged out and redirected to login.`);

                  // Clear auth and redirect to login
                  localStorage.removeItem("authToken");
                  window.location.href = "/login";
                } catch (error) {
                  alert(`Failed to reset database: ${error instanceof Error ? error.message : "Unknown error"}`);
                } finally {
                  setIsResetting(false);
                  setResetDialogOpen(false);
                  setResetConfirmText("");
                }
              }}
              disabled={isResetting || resetConfirmText !== "RESET"}
              data-testid="reset-database-confirm-button"
            >
              {isResetting ? "Resetting..." : "Reset Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
