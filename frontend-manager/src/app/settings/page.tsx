"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Database,
  Mail,
  Shield,
  Monitor,
  Server,
  Key,
  User,
  Bell,
  Globe,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface AppSettings {
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
    maintenance_mode: boolean;
  };
  database: {
    host: string;
    port: number;
    name: string;
    ssl: boolean;
    pool_size: number;
  };
  email: {
    enabled: boolean;
    provider: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    from_email: string;
    from_name: string;
  };
  security: {
    session_timeout: number;
    max_login_attempts: number;
    password_min_length: number;
    require_2fa: boolean;
    allowed_origins: string[];
  };
  monitoring: {
    enabled: boolean;
    health_check_interval: number;
    log_level: string;
    metrics_retention: number;
  };
  storage: {
    provider: string;
    max_file_size: number;
    allowed_types: string[];
    cleanup_interval: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("app");

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/krapi/k1/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/krapi/k1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (
      !confirm("Are you sure you want to reset all settings to default values?")
    )
      return;

    try {
      const response = await fetch("/api/krapi/k1/admin/settings/reset", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reset settings");

      await fetchSettings();
      setSuccess("Settings reset to defaults!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const updateSetting = (
    section: keyof AppSettings,
    field: string,
    value: any
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value,
      },
    });
  };

  const updateArraySetting = (
    section: keyof AppSettings,
    field: string,
    value: string
  ) => {
    if (!settings) return;

    const array = (settings[section] as any)[field] || [];
    const newArray = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: newArray,
      },
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      await fetchSettings();
      setLoading(false);
    };
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Failed to load settings
          </h2>
          <p className="text-gray-600 mb-4">
            There was an error loading the application settings.
          </p>
          <Button onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Settings</h1>
          <p className="text-gray-600">
            Configure application settings and preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="app">Application</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Application Settings</span>
              </CardTitle>
              <CardDescription>Basic application configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input
                    id="app-name"
                    value={settings.app.name}
                    onChange={(e) =>
                      updateSetting("app", "name", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="app-version">Version</Label>
                  <Input
                    id="app-version"
                    value={settings.app.version}
                    onChange={(e) =>
                      updateSetting("app", "version", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="app-environment">Environment</Label>
                  <Select
                    value={settings.app.environment}
                    onValueChange={(value) =>
                      updateSetting("app", "environment", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="debug-mode">Debug Mode</Label>
                    <p className="text-sm text-gray-600">
                      Enable debug logging and detailed error messages
                    </p>
                  </div>
                  <Switch
                    id="debug-mode"
                    checked={settings.app.debug}
                    onCheckedChange={(checked) =>
                      updateSetting("app", "debug", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-gray-600">
                      Put the application in maintenance mode
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.app.maintenance_mode}
                    onCheckedChange={(checked) =>
                      updateSetting("app", "maintenance_mode", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Settings</span>
              </CardTitle>
              <CardDescription>
                Database connection configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="db-host">Host</Label>
                  <Input
                    id="db-host"
                    value={settings.database.host}
                    onChange={(e) =>
                      updateSetting("database", "host", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="db-port">Port</Label>
                  <Input
                    id="db-port"
                    type="number"
                    value={settings.database.port}
                    onChange={(e) =>
                      updateSetting(
                        "database",
                        "port",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="db-name">Database Name</Label>
                  <Input
                    id="db-name"
                    value={settings.database.name}
                    onChange={(e) =>
                      updateSetting("database", "name", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="db-pool-size">Pool Size</Label>
                  <Input
                    id="db-pool-size"
                    type="number"
                    value={settings.database.pool_size}
                    onChange={(e) =>
                      updateSetting(
                        "database",
                        "pool_size",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="db-ssl">SSL Connection</Label>
                  <p className="text-sm text-gray-600">
                    Use SSL for database connections
                  </p>
                </div>
                <Switch
                  id="db-ssl"
                  checked={settings.database.ssl}
                  onCheckedChange={(checked) =>
                    updateSetting("database", "ssl", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Settings</span>
              </CardTitle>
              <CardDescription>Email service configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Email Enabled</Label>
                  <p className="text-sm text-gray-600">
                    Enable email functionality
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.email.enabled}
                  onCheckedChange={(checked) =>
                    updateSetting("email", "enabled", checked)
                  }
                />
              </div>
              {settings.email.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email-provider">Provider</Label>
                      <Select
                        value={settings.email.provider}
                        onValueChange={(value) =>
                          updateSetting("email", "provider", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smtp">SMTP</SelectItem>
                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                          <SelectItem value="mailgun">Mailgun</SelectItem>
                          <SelectItem value="ses">AWS SES</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="email-host">Host</Label>
                      <Input
                        id="email-host"
                        value={settings.email.host}
                        onChange={(e) =>
                          updateSetting("email", "host", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-port">Port</Label>
                      <Input
                        id="email-port"
                        type="number"
                        value={settings.email.port}
                        onChange={(e) =>
                          updateSetting(
                            "email",
                            "port",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-username">Username</Label>
                      <Input
                        id="email-username"
                        value={settings.email.username}
                        onChange={(e) =>
                          updateSetting("email", "username", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-from-email">From Email</Label>
                      <Input
                        id="email-from-email"
                        type="email"
                        value={settings.email.from_email}
                        onChange={(e) =>
                          updateSetting("email", "from_email", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-from-name">From Name</Label>
                      <Input
                        id="email-from-name"
                        value={settings.email.from_name}
                        onChange={(e) =>
                          updateSetting("email", "from_name", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-secure">Secure Connection</Label>
                      <p className="text-sm text-gray-600">
                        Use SSL/TLS for email connections
                      </p>
                    </div>
                    <Switch
                      id="email-secure"
                      checked={settings.email.secure}
                      onCheckedChange={(checked) =>
                        updateSetting("email", "secure", checked)
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Security and authentication configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session-timeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings.security.session_timeout}
                    onChange={(e) =>
                      updateSetting(
                        "security",
                        "session_timeout",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                  <Input
                    id="max-login-attempts"
                    type="number"
                    value={settings.security.max_login_attempts}
                    onChange={(e) =>
                      updateSetting(
                        "security",
                        "max_login_attempts",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="password-min-length">
                    Password Min Length
                  </Label>
                  <Input
                    id="password-min-length"
                    type="number"
                    value={settings.security.password_min_length}
                    onChange={(e) =>
                      updateSetting(
                        "security",
                        "password_min_length",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="allowed-origins">Allowed Origins</Label>
                  <Input
                    id="allowed-origins"
                    value={settings.security.allowed_origins.join(", ")}
                    onChange={(e) =>
                      updateArraySetting(
                        "security",
                        "allowed_origins",
                        e.target.value
                      )
                    }
                    placeholder="http://localhost:3000, https://example.com"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-2fa">Require 2FA</Label>
                  <p className="text-sm text-gray-600">
                    Require two-factor authentication for all users
                  </p>
                </div>
                <Switch
                  id="require-2fa"
                  checked={settings.security.require_2fa}
                  onCheckedChange={(checked) =>
                    updateSetting("security", "require_2fa", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Monitoring Settings</span>
              </CardTitle>
              <CardDescription>
                System monitoring and logging configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monitoring-enabled">Monitoring Enabled</Label>
                  <p className="text-sm text-gray-600">
                    Enable system monitoring and health checks
                  </p>
                </div>
                <Switch
                  id="monitoring-enabled"
                  checked={settings.monitoring.enabled}
                  onCheckedChange={(checked) =>
                    updateSetting("monitoring", "enabled", checked)
                  }
                />
              </div>
              {settings.monitoring.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="health-check-interval">
                        Health Check Interval (ms)
                      </Label>
                      <Input
                        id="health-check-interval"
                        type="number"
                        value={settings.monitoring.health_check_interval}
                        onChange={(e) =>
                          updateSetting(
                            "monitoring",
                            "health_check_interval",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="log-level">Log Level</Label>
                      <Select
                        value={settings.monitoring.log_level}
                        onValueChange={(value) =>
                          updateSetting("monitoring", "log_level", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debug">Debug</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="metrics-retention">
                        Metrics Retention (days)
                      </Label>
                      <Input
                        id="metrics-retention"
                        type="number"
                        value={settings.monitoring.metrics_retention}
                        onChange={(e) =>
                          updateSetting(
                            "monitoring",
                            "metrics_retention",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Storage Settings</span>
              </CardTitle>
              <CardDescription>File storage configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storage-provider">Storage Provider</Label>
                  <Select
                    value={settings.storage.provider}
                    onValueChange={(value) =>
                      updateSetting("storage", "provider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Filesystem</SelectItem>
                      <SelectItem value="s3">AWS S3</SelectItem>
                      <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                      <SelectItem value="azure">Azure Blob Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={settings.storage.max_file_size}
                    onChange={(e) =>
                      updateSetting(
                        "storage",
                        "max_file_size",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cleanup-interval">
                    Cleanup Interval (hours)
                  </Label>
                  <Input
                    id="cleanup-interval"
                    type="number"
                    value={settings.storage.cleanup_interval}
                    onChange={(e) =>
                      updateSetting(
                        "storage",
                        "cleanup_interval",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="allowed-types">Allowed File Types</Label>
                  <Input
                    id="allowed-types"
                    value={settings.storage.allowed_types.join(", ")}
                    onChange={(e) =>
                      updateArraySetting(
                        "storage",
                        "allowed_types",
                        e.target.value
                      )
                    }
                    placeholder="image/jpeg, image/png, application/pdf"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

