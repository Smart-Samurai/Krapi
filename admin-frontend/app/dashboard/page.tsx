"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WebSocketStatus from "@/components/WebSocketStatus";
import {
  projectAPI,
  healthAPI,
  filesAPI,
  usersAPI,
} from "@/lib/api";
import { HealthStatus } from "@/types";
import {
  Database,
  Activity,
  Clock,
  User,
  TrendingUp,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    projectsCount: 0,
    filesCount: 0,
    usersCount: 0,
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Only make API calls if user is authenticated
      if (!user) {
        console.log("User not authenticated, skipping API calls");
        return;
      }

      // Create base promises array
      const promises = [];

      // Add project and health API calls first (these are always allowed)
      promises.push(projectAPI.getAllProjects());
      promises.push(healthAPI.check());
      if (user?.role === "admin" || user?.permissions?.includes("files.read")) {
        promises.push(
          new Promise((resolve) => setTimeout(resolve, 200)).then(() =>
            filesAPI.getAllFiles()
          )
        );
      }
      if (user?.role === "admin" || user?.permissions?.includes("users.read")) {
        promises.push(
          new Promise((resolve) => setTimeout(resolve, 300)).then(() =>
            usersAPI.getAllUsers()
          )
        );
      }

      const responses = await Promise.all(promises);
      const [
        projectsResponse,
        healthResponse,
        filesResponse,
        usersResponse,
      ] = responses;

      if (projectsResponse.success) {
        setStats((prev) => ({
          ...prev,
          projectsCount: projectsResponse.data.length,
        }));
      }

      if (healthResponse.success && healthResponse.status === "OK") {
        setHealthStatus(healthResponse);
      }

      if (filesResponse?.success) {
        setStats((prev) => ({
          ...prev,
          filesCount: filesResponse.data.length,
        }));
      }

      if (usersResponse?.success) {
        setStats((prev) => ({
          ...prev,
          usersCount: usersResponse.data.length,
        }));
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Don't set loading to false on error, let user retry
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.permissions]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Show loading state while auth is loading or dashboard data is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Don't render if user is not available yet
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-text-500">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-1 text-sm text-text-500 dark:text-text-500">
            Here&apos;s what&apos;s happening with your Krapi CMS.
          </p>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Projects
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {stats.projectsCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-accent-400 dark:text-accent-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 dark:text-text-500 truncate">
                    API Status
                  </dt>
                  <dd className="flex items-center text-lg font-medium text-text-900 dark:text-text-50">
                    <CheckCircle className="h-4 w-4 text-accent-500 dark:text-accent-400 mr-1" />
                    {healthStatus?.status || "Unknown"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-secondary-400 dark:text-secondary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Server Uptime
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {healthStatus ? formatUptime(healthStatus.uptime) : "N/A"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-primary-400 dark:text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Current User
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {user?.role || "Admin"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WebSocket Status */}
      <WebSocketStatus />

      {/* Quick Actions */}
      <div className="bg-background-100 dark:bg-background-100 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50">
            Quick Actions
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-500 dark:text-text-500">
            Common tasks and shortcuts.
          </p>
        </div>
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="/projects"
              className="relative rounded-lg border border-background-300 bg-background-100 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-background-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-text-900">
                  Manage Projects
                </p>
                <p className="text-sm text-text-500 truncate">
                  Create and manage your projects
                </p>
              </div>
            </a>
            <a
              href="/dashboard/api"
              className="relative rounded-lg border border-background-300 bg-background-100 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-background-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-accent-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-text-900">
                  API Management
                </p>
                <p className="text-sm text-text-500 truncate">
                  Manage API keys and endpoints
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              href="/dashboard/content"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Content
            </a>
            <a
              href="/dashboard/api-test"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Activity className="h-4 w-4 mr-2" />
              Test API
            </a>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
