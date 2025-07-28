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

export default function HealthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const healthChecks = [
    {
      id: "api-server",
      name: "API Server",
      status: "healthy",
      responseTime: "45ms",
      uptime: "99.9%",
      lastCheck: "2 minutes ago",
      icon: FiServer,
    },
    {
      id: "database",
      name: "Database",
      status: "healthy",
      responseTime: "12ms",
      uptime: "99.8%",
      lastCheck: "1 minute ago",
      icon: FiDatabase,
    },
    {
      id: "file-storage",
      name: "File Storage",
      status: "healthy",
      responseTime: "78ms",
      uptime: "99.7%",
      lastCheck: "3 minutes ago",
      icon: FiGlobe,
    },
    {
      id: "websocket",
      name: "WebSocket Server",
      status: "warning",
      responseTime: "120ms",
      uptime: "98.5%",
      lastCheck: "30 seconds ago",
      icon: FiWifi,
    },
  ];

  const systemMetrics = [
    {
      name: "CPU Usage",
      value: "23%",
      status: "normal",
      trend: "stable",
    },
    {
      name: "Memory Usage",
      value: "67%",
      status: "normal",
      trend: "stable",
    },
    {
      name: "Disk Usage",
      value: "45%",
      status: "normal",
      trend: "stable",
    },
    {
      name: "Network I/O",
      value: "2.3 MB/s",
      status: "normal",
      trend: "stable",
    },
  ];

  const handleRefreshHealth = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLastChecked(new Date());
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <FiCheckCircle className="h-4 w-4" />;
      case "warning":
        return <FiAlertCircle className="h-4 w-4" />;
      case "error":
        return <FiAlertCircle className="h-4 w-4" />;
      default:
        return <FiClock className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">System Health</h1>
          <p className="text-text/60 mt-1">
            Monitor your KRAPI platform health and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiSettings className="mr-2 h-4 w-4" />
            Health Settings
          </Button>
          <IconButton
            icon={FiRefreshCw}
            onClick={handleRefreshHealth}
            variant="secondary"
            size="lg"
            disabled={isLoading}
            title="Refresh Health Status"
          />
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text">Overall Status</h2>
          <div className="flex items-center space-x-2 text-sm text-text/60">
            <span>Last checked:</span>
            <span>{lastChecked.toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  All Systems Operational
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  4/4 services healthy
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FiActivity className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Average Response Time
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">64ms</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FiServer className="h-6 w-6 text-purple-600" />
              <div>
                <p className="font-medium text-purple-800 dark:text-purple-200">
                  System Uptime
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  99.5%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FiAlertCircle className="h-6 w-6 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Active Alerts
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  1 warning
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">Service Health</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {healthChecks.map((check) => (
            <div
              key={check.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <check.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{check.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(
                          check.status
                        )}`}
                      >
                        {getStatusIcon(check.status)}
                        <span>{check.status}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Response: {check.responseTime}</span>
                      <span>Uptime: {check.uptime}</span>
                      <span>Last check: {check.lastCheck}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">System Metrics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemMetrics.map((metric) => (
              <div key={metric.name} className="bg-secondary/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-text">{metric.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      metric.status
                    )}`}
                  >
                    {metric.status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-text mb-1">
                  {metric.value}
                </p>
                <p className="text-sm text-text/60">Trend: {metric.trend}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Block */}
      <InfoBlock
        title="Health Monitoring"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI continuously monitors system health and performance to ensure
            optimal operation.
          </p>
          <p>
            <strong>Health Checks:</strong> Automated monitoring of all critical
            services with configurable thresholds and alerting.
          </p>
          <p>
            <strong>Metrics:</strong> Real-time system metrics including CPU,
            memory, disk usage, and network performance.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
