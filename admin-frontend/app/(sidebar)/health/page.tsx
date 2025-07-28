"use client";

import React, { useState, useEffect } from "react";
import { Button, IconButton, InfoBlock } from "@/components/styled";
import {
  FiActivity,
  FiServer,
  FiDatabase,
  FiGlobe,
  FiWifi,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSettings,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  responseTime: string;
  uptime: string;
  lastCheck: string;
  icon: any;
  details?: any;
}

export default function HealthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>({});
  const krapi = useKrapi();

  useEffect(() => {
    performHealthCheck();
    // Set up interval for periodic health checks
    const interval = setInterval(performHealthCheck, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const performHealthCheck = async () => {
    setIsLoading(true);
    try {
      const response = await krapi.client.health();
      if (response.success && response.data) {
        const data = response.data as any;
        
        // Transform health data into our format
        const checks: HealthCheck[] = [
          {
            id: "api-server",
            name: "API Server",
            status: data.api?.status === 'ok' ? 'healthy' : data.api?.status || 'unknown',
            responseTime: data.api?.responseTime || 'N/A',
            uptime: data.api?.uptime || '0%',
            lastCheck: 'Just now',
            icon: FiServer,
            details: data.api,
          },
          {
            id: "database",
            name: "Database",
            status: data.database?.status === 'ok' ? 'healthy' : data.database?.status || 'unknown',
            responseTime: data.database?.responseTime || 'N/A',
            uptime: data.database?.uptime || '0%',
            lastCheck: 'Just now',
            icon: FiDatabase,
            details: data.database,
          },
          {
            id: "file-storage",
            name: "File Storage",
            status: data.storage?.status === 'ok' ? 'healthy' : data.storage?.status || 'unknown',
            responseTime: data.storage?.responseTime || 'N/A',
            uptime: data.storage?.uptime || '0%',
            lastCheck: 'Just now',
            icon: FiGlobe,
            details: data.storage,
          },
          {
            id: "websocket",
            name: "WebSocket Server",
            status: data.websocket?.status === 'ok' ? 'healthy' : data.websocket?.status || 'unknown',
            responseTime: data.websocket?.responseTime || 'N/A',
            uptime: data.websocket?.uptime || '0%',
            lastCheck: 'Just now',
            icon: FiWifi,
            details: data.websocket,
          },
        ];
        
        setHealthChecks(checks);
        setSystemMetrics(data.metrics || {});
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error("Error performing health check:", error);
      // Set all services to error state
      setHealthChecks([
        {
          id: "api-server",
          name: "API Server",
          status: 'error',
          responseTime: 'N/A',
          uptime: 'N/A',
          lastCheck: 'Failed',
          icon: FiServer,
        },
        {
          id: "database",
          name: "Database",
          status: 'unknown',
          responseTime: 'N/A',
          uptime: 'N/A',
          lastCheck: 'Failed',
          icon: FiDatabase,
        },
        {
          id: "file-storage",
          name: "File Storage",
          status: 'unknown',
          responseTime: 'N/A',
          uptime: 'N/A',
          lastCheck: 'Failed',
          icon: FiGlobe,
        },
        {
          id: "websocket",
          name: "WebSocket Server",
          status: 'unknown',
          responseTime: 'N/A',
          uptime: 'N/A',
          lastCheck: 'Failed',
          icon: FiWifi,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <FiCheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <FiAlertCircle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <FiAlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FiAlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const overallHealth = healthChecks.every((check) => check.status === "healthy")
    ? "healthy"
    : healthChecks.some((check) => check.status === "error")
    ? "error"
    : healthChecks.some((check) => check.status === "warning")
    ? "warning"
    : "unknown";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">System Health</h1>
          <p className="text-text/60 mt-1">
            Monitor the health and performance of your KRAPI infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-text/60">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
          <Button
            variant="secondary"
            onClick={performHealthCheck}
            disabled={isLoading}
          >
            {isLoading ? (
              <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FiRefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3 rounded-lg ${
                overallHealth === "healthy"
                  ? "bg-green-100 dark:bg-green-900/20"
                  : overallHealth === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900/20"
                  : overallHealth === "error"
                  ? "bg-red-100 dark:bg-red-900/20"
                  : "bg-gray-100 dark:bg-gray-900/20"
              }`}
            >
              <FiActivity
                className={`h-8 w-8 ${getStatusColor(overallHealth)}`}
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-text">
                System Status:{" "}
                <span className={getStatusColor(overallHealth)}>
                  {overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1)}
                </span>
              </h2>
              <p className="text-text/60 mt-1">
                {overallHealth === "healthy"
                  ? "All systems are operational"
                  : overallHealth === "warning"
                  ? "Some systems require attention"
                  : overallHealth === "error"
                  ? "Critical issues detected"
                  : "Unable to determine system status"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {healthChecks.map((check) => (
          <div
            key={check.id}
            className="bg-background border border-secondary rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <check.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-text">{check.name}</h3>
                  <p className="text-sm text-text/60">
                    Last check: {check.lastCheck}
                  </p>
                </div>
              </div>
              {getStatusIcon(check.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text/60">Status</span>
                <span className={`font-medium ${getStatusColor(check.status)}`}>
                  {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text/60">Response Time</span>
                <span className="font-medium text-text">
                  {check.responseTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text/60">Uptime</span>
                <span className="font-medium text-text">{check.uptime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text">CPU Usage</h3>
            <FiActivity className="h-4 w-4 text-text/40" />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-text">
              {systemMetrics.cpu?.usage || '0'}%
            </div>
            <div className="w-full bg-secondary/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.cpu?.usage || 0}%` }}
              />
            </div>
            <p className="text-sm text-text/60">
              {systemMetrics.cpu?.cores || 0} cores available
            </p>
          </div>
        </div>

        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text">Memory Usage</h3>
            <FiServer className="h-4 w-4 text-text/40" />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-text">
              {systemMetrics.memory?.usage || '0'}%
            </div>
            <div className="w-full bg-secondary/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.memory?.usage || 0}%` }}
              />
            </div>
            <p className="text-sm text-text/60">
              {formatBytes(systemMetrics.memory?.used || 0)} / {formatBytes(systemMetrics.memory?.total || 0)}
            </p>
          </div>
        </div>

        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text">Disk Usage</h3>
            <FiDatabase className="h-4 w-4 text-text/40" />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-text">
              {systemMetrics.disk?.usage || '0'}%
            </div>
            <div className="w-full bg-secondary/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${systemMetrics.disk?.usage || 0}%` }}
              />
            </div>
            <p className="text-sm text-text/60">
              {formatBytes(systemMetrics.disk?.used || 0)} / {formatBytes(systemMetrics.disk?.total || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Info Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoBlock
          title="Health Monitoring"
          variant="info"
          className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        >
          <p>
            System health is monitored continuously. Automated alerts are sent
            when critical thresholds are reached. All metrics are updated in
            real-time.
          </p>
        </InfoBlock>

        <InfoBlock
          title="Maintenance Schedule"
          variant="warning"
          className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
        >
          <p>
            Regular maintenance windows are scheduled for the first Sunday of
            each month from 2:00 AM to 4:00 AM UTC. Services may be temporarily
            unavailable during this time.
          </p>
        </InfoBlock>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
