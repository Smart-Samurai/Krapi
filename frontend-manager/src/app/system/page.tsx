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
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
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

export default function SystemPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
      const response = await fetch("/api/system/logs");
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchSystemStatus(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case "error":
      case "fatal":
        return "text-red-600 bg-red-50";
      case "warn":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
      case "debug":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
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

  if (loading && !systemStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">
            Monitor system health, logs, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50" : ""}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {systemStatus && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health Checks</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    System Health
                  </CardTitle>
                  {getHealthIcon(systemStatus.monitor.overallHealth)}
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getHealthColor(
                      systemStatus.monitor.overallHealth
                    )}`}
                  >
                    {systemStatus.monitor.overallHealth.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-600">Overall system status</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatUptime(systemStatus.uptime)}
                  </div>
                  <p className="text-xs text-gray-600">System running time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Memory Usage
                  </CardTitle>
                  <MemoryStick className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatBytes(systemStatus.memory.heapUsed)}
                  </div>
                  <p className="text-xs text-gray-600">
                    Heap used / {formatBytes(systemStatus.memory.heapTotal)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Version</CardTitle>
                  <Settings className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {systemStatus.version}
                  </div>
                  <p className="text-xs text-gray-600">
                    {systemStatus.environment}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>
                  Current status of all system services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.monitor.healthChecks.database?.status ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Server className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Backend API</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.monitor.healthChecks.services?.details
                          ?.backend
                          ? "Running"
                          : "Stopped"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Monitor className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Frontend</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.monitor.healthChecks.services?.details
                          ?.frontend
                          ? "Running"
                          : "Stopped"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Logger</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.logger.totalLogs} logs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">Error Handler</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.errorHandler.isHealthy
                          ? "Healthy"
                          : "Issues"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="font-medium">Monitor</p>
                      <p className="text-sm text-gray-600">
                        {systemStatus.monitor.isHealthy ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Checks</CardTitle>
                <CardDescription>
                  Detailed health check results for all system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(systemStatus.monitor.healthChecks).map(
                    ([name, check]: [string, any]) => (
                      <div key={name} className="p-4 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getHealthIcon(check.status)}
                            <h4 className="font-medium capitalize">
                              {check.name}
                            </h4>
                          </div>
                          <Badge className={getHealthColor(check.status)}>
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {check.message}
                        </p>
                        {check.details && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-500 cursor-pointer">
                              Details
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-x-auto">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>
                  Recent performance metrics and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Memory Usage</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>RSS:</span>
                          <span>{formatBytes(systemStatus.memory.rss)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Heap Total:</span>
                          <span>
                            {formatBytes(systemStatus.memory.heapTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Heap Used:</span>
                          <span>
                            {formatBytes(systemStatus.memory.heapUsed)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>External:</span>
                          <span>
                            {formatBytes(systemStatus.memory.external)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Logger Statistics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Logs:</span>
                          <span>{systemStatus.logger.totalLogs}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Log File Size:</span>
                          <span>
                            {formatBytes(systemStatus.logger.logFileSize)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Logger Uptime:</span>
                          <span>
                            {formatUptime(systemStatus.logger.uptime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Recent system logs and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getLogLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {log.service}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{log.message}</p>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Data
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
        </Tabs>
      )}
    </div>
  );
}

