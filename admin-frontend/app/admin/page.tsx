"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Loader2,
  Folder,
  Settings,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  projectsCount: number;
  totalUsersCount: number;
  totalFilesCount: number;
  totalCollectionsCount: number;
  totalDocumentsCount: number;
  activeProjectsCount: number;
}

interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

interface RecentProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  user_count: number;
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    projectsCount: 0,
    totalUsersCount: 0,
    totalFilesCount: 0,
    totalCollectionsCount: 0,
    totalDocumentsCount: 0,
    activeProjectsCount: 0,
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastRefresh, _setLastRefresh] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const krapi = createDefaultKrapi();

      // Load projects
      const projectsResponse = await krapi.admin.listProjects();
      if (projectsResponse.success) {
        // Transform projects to match RecentProject type
        const recentProjects = (projectsResponse.data || []).map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description || "No description",
          status: project.status,
          created_at: project.created_at,
          user_count: 0, // Placeholder value
        }));
        setRecentProjects(recentProjects);
      }

      // Load health status
      const healthResponse = await krapi.admin.health();
      if (healthResponse.success) {
        setHealthStatus(healthResponse.data);
      }

      // Load database stats
      const dbStatsResponse = await krapi.admin.getDatabaseStats();
      if (dbStatsResponse.success) {
        // Transform to match AdminStats type
        setStats({
          projectsCount: 0,
          activeProjectsCount: 0,
          totalCollectionsCount: 0,
          totalDocumentsCount: 0,
          totalUsersCount: 0,
          totalFilesCount: 0,
        });
      }

      // Load API keys
      const apiKeysResponse = await krapi.admin.listApiKeys();
      if (apiKeysResponse.success) {
        // Could add API key stats here if needed
      }

      // Load files
      const filesResponse = await krapi.storage.listFiles();
      if (filesResponse.success) {
        // setFiles(filesResponse.data || []); // No state for files
      }

      // Load collections
      const collectionsResponse = await krapi.database.listCollections();
      if (collectionsResponse.success) {
        // setCollections(collectionsResponse.data || []); // No state for collections
      }

      // Load documents
      const documentsResponse = await krapi.database.listDocuments("users");
      if (documentsResponse.success) {
        // setDocuments(documentsResponse.data || []); // No state for documents
      }

      // Load recent activity
      // setRecentActivity([ // No state for recent activity
      //   {
      //     id: 1,
      //     type: "project_created",
      //     description: "New project 'Test Project' created",
      //     timestamp: new Date().toISOString(),
      //     user: "admin",
      //   },
      //   {
      //     id: 2,
      //     type: "user_login",
      //     description: "User 'admin' logged in",
      //     timestamp: new Date(Date.now() - 3600000).toISOString(),
      //     user: "admin",
      //   },
      // ]);
    } catch {
      setErrors(["Failed to load dashboard data"]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return "Never";
    return lastRefresh.toLocaleTimeString();
  };

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "healthy":
      case "ok":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive":
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "suspended":
      case "error":
      case "unhealthy":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "healthy":
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "inactive":
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "suspended":
      case "error":
      case "unhealthy":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  // Show loading state while auth is loading or dashboard data is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is not available yet or not admin
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-2">
            Admin Access Required
          </h3>
          <p className="text-text-600 dark:text-text-400">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Some data could not be loaded
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-800 dark:hover:bg-red-700"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-400">
                Global project management and system overview.
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                  {user?.role}
                </span>
                <span className="text-xs text-text-400">
                  Last updated: {formatLastRefresh()}
                </span>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Projects */}
        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Folder className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Total Projects
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {stats.projectsCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Active Projects
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {stats.activeProjectsCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
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
                    {getStatusIcon(healthStatus?.status || "Unknown")}
                    {healthStatus?.status || "Unknown"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Server Uptime */}
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
      </div>

      {/* Recent Projects */}
      <div className="bg-background-100 dark:bg-background-100 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50">
            Recent Projects
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-500 dark:text-text-500">
            Latest projects created in the system.
          </p>
        </div>
        <ul className="divide-y divide-background-200">
          {recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <li key={project.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Folder className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-primary-600">
                          {project.name}
                        </p>
                        <p className="text-sm text-text-500">
                          {project.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <div className="text-sm text-text-500">
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li>
              <div className="px-4 py-8 text-center">
                <Folder className="mx-auto h-12 w-12 text-text-400" />
                <h3 className="mt-2 text-sm font-medium text-text-900">
                  No projects yet
                </h3>
                <p className="mt-1 text-sm text-text-500">
                  Create your first project to get started.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/projects"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Folder className="h-4 w-4 mr-2" />
              Manage Projects
            </a>
            <a
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Users className="h-4 w-4 mr-2" />
              Admin Users
            </a>
            <a
              href="/admin/settings"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </a>
            <a
              href="/admin/api-test"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Activity className="h-4 w-4 mr-2" />
              Test API
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
