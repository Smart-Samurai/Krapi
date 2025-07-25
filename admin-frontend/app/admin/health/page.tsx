"use client";

import { useState, useEffect } from "react";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  Clock,
  Server,
  Wifi,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export default function HealthCheckPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const checkHealth = async () => {
    try {
      setError(null);
      const response = await createDefaultKrapi().admin.health();
      setHealthStatus(response.data as HealthStatus);
      setLastChecked(new Date());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect to API";
      setError(errorMessage);
      setHealthStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Checking system health...</p>
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
                Health Monitor
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-400">
                Monitor API server status and performance metrics.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-background-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-text-700 dark:text-text-300">
                  Auto-refresh
                </span>
              </label>
              <Button
                onClick={checkHealth}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Connection Error
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Status */}
      {!error && healthStatus && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Server className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      Server Status
                    </dt>
                    <dd className="text-lg font-medium text-text-900 dark:text-text-50">
                      {healthStatus.status}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      Uptime
                    </dt>
                    <dd className="text-lg font-medium text-text-900 dark:text-text-50">
                      {formatUptime(healthStatus.uptime)}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wifi className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      API Version
                    </dt>
                    <dd className="text-lg font-medium text-text-900 dark:text-text-50">
                      {healthStatus.version}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      Last Check
                    </dt>
                    <dd className="text-lg font-medium text-text-900 dark:text-text-50">
                      {lastChecked ? lastChecked.toLocaleTimeString() : "N/A"}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Information */}
      {!error && healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Detailed system metrics and configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Server Time
                </dt>
                <dd className="mt-1 text-sm text-text-900 dark:text-text-50">
                  {new Date(healthStatus.timestamp).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Environment
                </dt>
                <dd className="mt-1 text-sm text-text-900 dark:text-text-50">
                  Development
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  API Endpoint
                </dt>
                <dd className="mt-1 text-sm text-text-900 dark:text-text-50">
                  /krapi/v1
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Response Time
                </dt>
                <dd className="mt-1 text-sm text-text-900 dark:text-text-50">
                  {lastChecked ? "Real-time" : "N/A"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
