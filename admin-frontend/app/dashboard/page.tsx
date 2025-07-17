"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WebSocketStatus from "@/components/WebSocketStatus";
import {
  contentAPI,
  healthAPI,
  routesAPI,
  filesAPI,
  usersAPI,
} from "@/lib/api";
import { ContentItem, HealthStatus } from "@/types";
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
  const { user } = useAuth();
  const [stats, setStats] = useState({
    contentCount: 0,
    routesCount: 0,
    filesCount: 0,
    usersCount: 0,
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Only make API calls if user is authenticated
      if (!user) {
        console.log("User not authenticated, skipping API calls");
        return;
      }

      const promises = [contentAPI.getAllContent(), healthAPI.check()];

      // Add admin-only API calls based on user permissions
      if (
        user?.role === "admin" ||
        user?.permissions?.includes("routes.read")
      ) {
        promises.push(routesAPI.getAllRoutes());
      }
      if (user?.role === "admin" || user?.permissions?.includes("files.read")) {
        promises.push(filesAPI.getAllFiles());
      }
      if (user?.role === "admin" || user?.permissions?.includes("users.read")) {
        promises.push(usersAPI.getAllUsers());
      }

      const responses = await Promise.all(promises);
      const [
        contentResponse,
        healthResponse,
        routesResponse,
        filesResponse,
        usersResponse,
      ] = responses;

      if (contentResponse.success) {
        setStats((prev) => ({
          ...prev,
          contentCount: contentResponse.data.length,
        }));
        // Get 5 most recent items
        const sorted = contentResponse.data
          .sort(
            (a: ContentItem, b: ContentItem) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          )
          .slice(0, 5);
        setRecentContent(sorted);
      }

      if (healthResponse.success && healthResponse.status === "OK") {
        setHealthStatus(healthResponse);
      }

      if (routesResponse?.success) {
        setStats((prev) => ({
          ...prev,
          routesCount: routesResponse.data.length,
        }));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your Krapi CMS.
          </p>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Content Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.contentCount}
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
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    API Status
                  </dt>
                  <dd className="flex items-center text-lg font-medium text-gray-900">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    {healthStatus?.status || "Unknown"}
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
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Server Uptime
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {healthStatus ? formatUptime(healthStatus.uptime) : "N/A"}
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
                <User className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Current User
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
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

      {/* Recent Content */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Content Updates
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest content items that have been modified.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentContent.length > 0 ? (
            recentContent.map((item) => (
              <li key={item.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">
                          {item.key}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li>
              <div className="px-4 py-8 text-center">
                <Database className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No content yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first content item.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              href="/dashboard/content"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Content
            </a>
            <a
              href="/dashboard/api-test"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Activity className="h-4 w-4 mr-2" />
              Test API
            </a>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
