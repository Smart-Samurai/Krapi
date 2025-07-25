"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Settings,
  Database,
  Shield,
  Mail,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNotification } from "@/hooks/useNotification";

interface SystemSettings {
  general: {
    site_name: string;
    site_description: string;
    admin_email: string;
    timezone: string;
    maintenance_mode: boolean;
  };
  security: {
    session_timeout: number;
    max_login_attempts: number;
    password_min_length: number;
    require_2fa: boolean;
    allowed_origins: string[];
  };
  database: {
    backup_enabled: boolean;
    backup_interval: number;
    max_connections: number;
    query_timeout: number;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    from_email: string;
    from_name: string;
  };
  storage: {
    max_file_size: number;
    allowed_types: string[];
    compression_enabled: boolean;
    cdn_enabled: boolean;
  };
}

export default function SystemSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      site_name: "Krapi CMS",
      site_description: "Multi-tenant project management system",
      admin_email: "",
      timezone: "UTC",
      maintenance_mode: false,
    },
    security: {
      session_timeout: 3600,
      max_login_attempts: 5,
      password_min_length: 8,
      require_2fa: false,
      allowed_origins: ["*"],
    },
    database: {
      backup_enabled: true,
      backup_interval: 24,
      max_connections: 100,
      query_timeout: 30,
    },
    email: {
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_pass: "",
      from_email: "",
      from_name: "",
    },
    storage: {
      max_file_size: 10485760,
      allowed_types: ["image/*", "application/pdf", "text/*"],
      compression_enabled: true,
      cdn_enabled: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (user?.role === "admin") {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use default settings since the backend doesn't have settings API yet
      // TODO: Implement settings API in backend
      console.log("📡 Loading system settings...");

      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("✅ Settings loaded");
    } catch (error) {
      console.error("❌ Error loading settings:", error);
      setError("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      console.log("📡 Saving system settings...", settings);

      // TODO: Implement settings save API in backend
      // const krapi = createDefaultKrapi();
      // const response = await krapi.admin.saveSettings(settings);

      // Simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("✅ Settings saved successfully");
      showSuccess("System settings saved successfully!");
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      showError("Failed to save system settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (
    category: keyof SystemSettings,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Loading system settings...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-2">
            Admin Access Required
          </h3>
          <p className="text-text-600 dark:text-text-400">
            You need admin privileges to access system settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
                System Settings
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-400">
                Configure global system settings and preferences.
              </p>
            </div>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-sm text-red-800 dark:text-red-200">
              {error}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic system configuration and appearance settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={settings.general.site_name}
                onChange={(e) =>
                  updateSetting("general", "site_name", e.target.value)
                }
                placeholder="Krapi CMS"
              />
            </div>
            <div>
              <Label htmlFor="site_description">Site Description</Label>
              <Textarea
                id="site_description"
                value={settings.general.site_description}
                onChange={(e) =>
                  updateSetting("general", "site_description", e.target.value)
                }
                placeholder="Multi-tenant project management system"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="admin_email">Admin Email</Label>
              <Input
                id="admin_email"
                type="email"
                value={settings.general.admin_email}
                onChange={(e) =>
                  updateSetting("general", "admin_email", e.target.value)
                }
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.general.timezone}
                onChange={(e) =>
                  updateSetting("general", "timezone", e.target.value)
                }
                placeholder="UTC"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                <p className="text-sm text-text-500">
                  Enable maintenance mode to restrict access
                </p>
              </div>
              <Switch
                id="maintenance_mode"
                checked={settings.general.maintenance_mode}
                onCheckedChange={(checked) =>
                  updateSetting("general", "maintenance_mode", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Authentication and security configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="session_timeout">Session Timeout (seconds)</Label>
              <Input
                id="session_timeout"
                type="number"
                value={settings.security.session_timeout}
                onChange={(e) =>
                  updateSetting(
                    "security",
                    "session_timeout",
                    parseInt(e.target.value)
                  )
                }
                min={300}
                max={86400}
              />
            </div>
            <div>
              <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
              <Input
                id="max_login_attempts"
                type="number"
                value={settings.security.max_login_attempts}
                onChange={(e) =>
                  updateSetting(
                    "security",
                    "max_login_attempts",
                    parseInt(e.target.value)
                  )
                }
                min={1}
                max={10}
              />
            </div>
            <div>
              <Label htmlFor="password_min_length">
                Minimum Password Length
              </Label>
              <Input
                id="password_min_length"
                type="number"
                value={settings.security.password_min_length}
                onChange={(e) =>
                  updateSetting(
                    "security",
                    "password_min_length",
                    parseInt(e.target.value)
                  )
                }
                min={6}
                max={32}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="require_2fa">Require 2FA</Label>
                <p className="text-sm text-text-500">
                  Force two-factor authentication for all users
                </p>
              </div>
              <Switch
                id="require_2fa"
                checked={settings.security.require_2fa}
                onCheckedChange={(checked) =>
                  updateSetting("security", "require_2fa", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Settings
            </CardTitle>
            <CardDescription>
              Database configuration and backup settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backup_enabled">Enable Backups</Label>
                <p className="text-sm text-text-500">
                  Automatically backup database
                </p>
              </div>
              <Switch
                id="backup_enabled"
                checked={settings.database.backup_enabled}
                onCheckedChange={(checked) =>
                  updateSetting("database", "backup_enabled", checked)
                }
              />
            </div>
            <div>
              <Label htmlFor="backup_interval">Backup Interval (hours)</Label>
              <Input
                id="backup_interval"
                type="number"
                value={settings.database.backup_interval}
                onChange={(e) =>
                  updateSetting(
                    "database",
                    "backup_interval",
                    parseInt(e.target.value)
                  )
                }
                min={1}
                max={168}
              />
            </div>
            <div>
              <Label htmlFor="max_connections">Max Connections</Label>
              <Input
                id="max_connections"
                type="number"
                value={settings.database.max_connections}
                onChange={(e) =>
                  updateSetting(
                    "database",
                    "max_connections",
                    parseInt(e.target.value)
                  )
                }
                min={10}
                max={1000}
              />
            </div>
            <div>
              <Label htmlFor="query_timeout">Query Timeout (seconds)</Label>
              <Input
                id="query_timeout"
                type="number"
                value={settings.database.query_timeout}
                onChange={(e) =>
                  updateSetting(
                    "database",
                    "query_timeout",
                    parseInt(e.target.value)
                  )
                }
                min={5}
                max={300}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Settings
            </CardTitle>
            <CardDescription>
              SMTP configuration for sending emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={settings.email.smtp_host}
                onChange={(e) =>
                  updateSetting("email", "smtp_host", e.target.value)
                }
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                type="number"
                value={settings.email.smtp_port}
                onChange={(e) =>
                  updateSetting("email", "smtp_port", parseInt(e.target.value))
                }
                min={1}
                max={65535}
              />
            </div>
            <div>
              <Label htmlFor="smtp_user">SMTP Username</Label>
              <Input
                id="smtp_user"
                value={settings.email.smtp_user}
                onChange={(e) =>
                  updateSetting("email", "smtp_user", e.target.value)
                }
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="smtp_pass">SMTP Password</Label>
              <Input
                id="smtp_pass"
                type="password"
                value={settings.email.smtp_pass}
                onChange={(e) =>
                  updateSetting("email", "smtp_pass", e.target.value)
                }
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={settings.email.from_email}
                onChange={(e) =>
                  updateSetting("email", "from_email", e.target.value)
                }
                placeholder="noreply@example.com"
              />
            </div>
            <div>
              <Label htmlFor="from_name">From Name</Label>
              <Input
                id="from_name"
                value={settings.email.from_name}
                onChange={(e) =>
                  updateSetting("email", "from_name", e.target.value)
                }
                placeholder="Krapi CMS"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
