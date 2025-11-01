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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Database,
  Server,
  Users,
  Settings,
  FileText,
  Mail,
  Key,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface SystemStatus {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  logger: {
    totalLogs: number;
    logFileSize: number;
    metrics: any;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  errorHandler: {
    isHealthy: boolean;
    errorStats: any;
    recoveryStats: any;
  };
  monitor: {
    isHealthy: boolean;
    overallHealth: "healthy" | "warning" | "critical";
    healthChecks: any;
    recentMetrics: any[];
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  service: string;
  message: string;
  data?: any;
}

export default function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch("/api/system/status");
      if (!response.ok) throw new Error("Failed to fetch system status");
      const data = await response.json();
      setSystemStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/system/logs?limit=50");
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSystemStatus(), fetchLogs()]);
      setLoading(false);
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
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
          <h1 className="text-3xl font-bold">KRAPI Dashboard</h1>
          <p className="text-gray-600">System monitoring and management</p>
        </div>
        <div className="flex items-center space-x-2">
          {systemStatus && (
            <Badge
              className={getHealthColor(systemStatus.monitor.overallHealth)}
            >
              {getHealthIcon(systemStatus.monitor.overallHealth)}
              <span className="ml-1 capitalize">
                {systemStatus.monitor.overallHealth}
              </span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Health
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemStatus?.monitor.overallHealth === "healthy"
                    ? "100%"
                    : systemStatus?.monitor.overallHealth === "warning"
                    ? "75%"
                    : "25%"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemStatus?.monitor.overallHealth} status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemStatus
                    ? formatUptime(systemStatus.uptime)
                    : "0d 0h 0m"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Since last restart
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Memory Usage
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemStatus
                    ? formatBytes(systemStatus.memory.heapUsed)
                    : "0 MB"}
                </div>
                <p className="text-xs text-muted-foreground">
                  of{" "}
                  {systemStatus
                    ? formatBytes(systemStatus.memory.heapTotal)
                    : "0 MB"}{" "}
                  total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Logs
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemStatus?.logger.totalLogs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemStatus
                    ? formatBytes(systemStatus.logger.logFileSize)
                    : "0 MB"}{" "}
                  log files
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Checks</CardTitle>
                <CardDescription>Current system health status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {systemStatus?.monitor.healthChecks &&
                  Object.entries(systemStatus.monitor.healthChecks).map(
                    ([name, check]: [string, any]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-2">
                          {getHealthIcon(check.status)}
                          <span className="font-medium capitalize">{name}</span>
                        </div>
                        <Badge className={getHealthColor(check.status)}>
                          {check.status}
                        </Badge>
                      </div>
                    )
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Version:</span>
                  <span className="text-sm font-medium">
                    {systemStatus?.version}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Environment:</span>
                  <Badge variant="outline">{systemStatus?.environment}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Memory (RSS):</span>
                  <span className="text-sm font-medium">
                    {systemStatus
                      ? formatBytes(systemStatus.memory.rss)
                      : "0 MB"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    External Memory:
                  </span>
                  <span className="text-sm font-medium">
                    {systemStatus
                      ? formatBytes(systemStatus.memory.external)
                      : "0 MB"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Metrics</CardTitle>
              <CardDescription>
                System performance and health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemStatus?.monitor.recentMetrics &&
                  systemStatus.monitor.recentMetrics.length > 0 &&
                  Object.entries(systemStatus.monitor.recentMetrics[0]).map(
                    ([key, value]: [string, any]) => (
                      <div key={key} className="p-4 border rounded">
                        <h4 className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </p>
                      </div>
                    )
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                Recent system activity and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={
                            log.level === "error" || log.level === "fatal"
                              ? "bg-red-100 text-red-800"
                              : log.level === "warn"
                              ? "bg-yellow-100 text-yellow-800"
                              : log.level === "info"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {log.level}
                        </Badge>
                        <span className="font-medium">{log.service}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{log.message}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Details
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  Manage admin users and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Manage Users</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Database</span>
                </CardTitle>
                <CardDescription>
                  Database operations and health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Database Tools</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>API Keys</span>
                </CardTitle>
                <CardDescription>Manage API keys and access</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">API Keys</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email</span>
                </CardTitle>
                <CardDescription>Email templates and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Email Settings</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Settings</span>
                </CardTitle>
                <CardDescription>Configure system parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Settings</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Projects</span>
                </CardTitle>
                <CardDescription>
                  Manage projects and collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Projects</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

