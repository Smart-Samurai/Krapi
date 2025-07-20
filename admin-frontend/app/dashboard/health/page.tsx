"use client";

import { useState, useEffect } from "react";
import { healthAPI } from "@/lib/api";
import { HealthStatus } from "@/types";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Server,
  Wifi,
} from "lucide-react";

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
      interval = setInterval(checkHealth, 5000); // Check every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const checkHealth = async () => {
    try {
      setError(null);
      const response = await healthAPI.check();
      setHealthStatus(response);
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
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = () => {
    if (error) return "text-destructive-600 bg-destructive-100";
    if (healthStatus?.status === "OK") return "text-accent-600 bg-accent-100";
    return "text-secondary-600 bg-secondary-100";
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-6 w-6" />;
    if (healthStatus?.status === "OK")
      return <CheckCircle className="h-6 w-6" />;
    return <Activity className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-900">Health Check</h1>
              <p className="mt-1 text-sm text-text-500">
                Monitor API server status and performance
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
                <span className="ml-2 text-sm text-text-700">Auto-refresh</span>
              </label>
              <button
                onClick={checkHealth}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background hover:bg-background-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div
              className={`flex-shrink-0 p-3 rounded-full ${getStatusColor()}`}
            >
              {getStatusIcon()}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-text-900">
                API Server Status
              </h3>
              <p className="text-sm text-text-500">
                {error ? "Disconnected" : healthStatus?.status || "Unknown"}
              </p>
            </div>
          </div>

          {lastChecked && (
            <div className="mt-4 text-sm text-text-500">
              Last checked: {lastChecked.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Information */}
      {!error && healthStatus && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                                  <Server className="h-6 w-6 text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Server Status
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {healthStatus.status}
                  </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                                  <Clock className="h-6 w-6 text-accent-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Uptime
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {formatUptime(healthStatus.uptime)}
                  </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                                  <Wifi className="h-6 w-6 text-secondary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Connection
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    Active
                  </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="rounded-md bg-destructive-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive-800">
                    Connection Error
                  </h3>
                  <div className="mt-2 text-sm text-destructive-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <button
                        onClick={checkHealth}
                        className="bg-destructive-50 px-2 py-1.5 rounded-md text-sm font-medium text-destructive-800 hover:bg-destructive-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-destructive-50 focus:ring-destructive-600"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Information */}
      {!error && healthStatus && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-text-900 mb-4">
              System Information
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Server Time
                </dt>
                <dd className="mt-1 text-sm text-text-900">
                  {new Date(healthStatus.timestamp).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Response Time
                </dt>
                <dd className="mt-1 text-sm text-text-900">
                  {lastChecked ? "Real-time" : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  API Version
                </dt>
                <dd className="mt-1 text-sm text-text-900">v1.0.0</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-500">
                  Environment
                </dt>
                <dd className="mt-1 text-sm text-text-900">Development</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
