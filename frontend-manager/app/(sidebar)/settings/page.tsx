"use client";

import React, { useState } from "react";
import {
  Button,
  InfoBlock,
  IconButton,
  TextButton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  FiSettings,
  FiShield,
  FiGlobe,
  FiMail,
  FiDatabase,
  FiServer,
  FiUser,
  FiBell,
  FiKey,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

const settingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteUrl: z.string().url("Please enter a valid URL"),
  adminEmail: z.string().email("Please enter a valid email"),
  timezone: z.string().min(1, "Timezone is required"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: FiSettings },
    { id: "security", label: "Security", icon: FiShield },
    { id: "email", label: "Email", icon: FiMail },
    { id: "database", label: "Database", icon: FiDatabase },
    { id: "notifications", label: "Notifications", icon: FiBell },
  ];

  const handleSaveSettings = async (data: SettingsFormData) => {
    console.log("Saving settings:", data);
    setIsSaveDialogOpen(false);
    // Here you would typically make an API call
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          Site Configuration
        </h3>
        <Form schema={settingsSchema} onSubmit={handleSaveSettings}>
          <div className="space-y-4">
            <FormField
              name="siteName"
              label="Site Name"
              type="text"
              placeholder="KRAPI Admin"
              required
            />
            <FormField
              name="siteUrl"
              label="Site URL"
              type="text"
              placeholder="https://admin.krapi.local"
              required
            />
            <FormField
              name="adminEmail"
              label="Admin Email"
              type="email"
              placeholder="admin@krapi.local"
              required
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
                { value: "Europe/London", label: "London" },
                { value: "Europe/Paris", label: "Paris" },
                { value: "Asia/Tokyo", label: "Tokyo" },
              ]}
              required
            />
          </div>
        </Form>
      </div>

      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Dark Mode</p>
              <p className="text-sm text-text/60">
                Enable dark theme by default
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Language</p>
              <p className="text-sm text-text/60">Set default language</p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Two-Factor Authentication</p>
              <p className="text-sm text-text/60">Require 2FA for all users</p>
            </div>
            <Button variant="secondary" size="sm">
              Enable
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Session Timeout</p>
              <p className="text-sm text-text/60">
                Auto-logout after inactivity
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Password Policy</p>
              <p className="text-sm text-text/60">
                Minimum requirements for passwords
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">API Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">API Rate Limiting</p>
              <p className="text-sm text-text/60">
                Limit API requests per minute
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">CORS Settings</p>
              <p className="text-sm text-text/60">Configure allowed origins</p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          SMTP Configuration
        </h3>
        <div className="space-y-4">
          <FormField
            name="smtpHost"
            label="SMTP Host"
            type="text"
            placeholder="smtp.gmail.com"
          />
          <FormField
            name="smtpPort"
            label="SMTP Port"
            type="number"
            placeholder="587"
          />
          <FormField
            name="smtpUsername"
            label="SMTP Username"
            type="text"
            placeholder="your-email@gmail.com"
          />
          <FormField
            name="smtpPassword"
            label="SMTP Password"
            type="password"
            placeholder="Enter SMTP password"
          />
          <Button variant="default">
            <FiMail className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>
      </div>

      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          Email Templates
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Welcome Email</p>
              <p className="text-sm text-text/60">Email sent to new users</p>
            </div>
            <Button variant="secondary" size="sm">
              Edit Template
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Password Reset</p>
              <p className="text-sm text-text/60">
                Password reset email template
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Edit Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatabaseSettings = () => (
    <div className="space-y-6">
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          Database Configuration
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Connection Pool</p>
              <p className="text-sm text-text/60">
                Configure database connection pool
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Backup Schedule</p>
              <p className="text-sm text-text/60">Automated database backups</p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Query Logging</p>
              <p className="text-sm text-text/60">Log slow database queries</p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Maintenance</h3>
        <div className="space-y-4">
          <Button variant="secondary" className="w-full justify-start">
            <FiDatabase className="mr-2 h-4 w-4" />
            Optimize Database
          </Button>
          <Button variant="secondary" className="w-full justify-start">
            <FiTrash2 className="mr-2 h-4 w-4" />
            Clear Cache
          </Button>
          <Button variant="secondary" className="w-full justify-start">
            <FiServer className="mr-2 h-4 w-4" />
            Rebuild Indexes
          </Button>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          System Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">System Alerts</p>
              <p className="text-sm text-text/60">
                Critical system notifications
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">User Activity</p>
              <p className="text-sm text-text/60">
                User login and activity logs
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Error Reports</p>
              <p className="text-sm text-text/60">
                Application error notifications
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-background border border-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          Email Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Weekly Reports</p>
              <p className="text-sm text-text/60">Send weekly system reports</p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Security Alerts</p>
              <p className="text-sm text-text/60">
                Security-related notifications
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return renderGeneralSettings();
      case "security":
        return renderSecuritySettings();
      case "email":
        return renderEmailSettings();
      case "database":
        return renderDatabaseSettings();
      case "notifications":
        return renderNotificationSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Settings</h1>
          <p className="text-text/60 mt-1">
            Configure your KRAPI platform settings
          </p>
        </div>
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg">
              <FiSave className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Settings</DialogTitle>
              <DialogDescription>
                Are you sure you want to save all changes? This will update your
                platform configuration.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="default">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="border-b border-secondary">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text/60 hover:text-text"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* Info Block */}
      <InfoBlock
        title="Settings Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            Settings are organized into categories for easy management. Changes
            are applied immediately unless specified otherwise.
          </p>
          <p>
            <strong>General:</strong> Basic platform configuration and
            appearance
          </p>
          <p>
            <strong>Security:</strong> Authentication, authorization, and API
            security
          </p>
          <p>
            <strong>Email:</strong> SMTP configuration and email templates
          </p>
          <p>
            <strong>Database:</strong> Database configuration and maintenance
          </p>
          <p>
            <strong>Notifications:</strong> System and email notification
            settings
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
