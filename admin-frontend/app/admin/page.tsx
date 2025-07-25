"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Folder,
  RefreshCw,
  Loader2,
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== "admin") {
      console.log("User not admin, skipping admin data load");
      return;
    }

    console.log("🔄 Starting admin dashboard data load...");
    setIsLoading(true);
    setErrors([]);

    const krapi = createDefaultKrapi();
    const newErrors: string[] = [];
    const newStats = { ...stats };

    try {
      // 1. Health Check
      try {
        console.log("📡 Checking API health...");
        const healthResponse = await krapi.admin.health();
        console.log("✅ Health check successful:", healthResponse);
        if (healthResponse.success && healthResponse.data) {
          setHealthStatus(healthResponse.data);
        }
      } catch (error) {
        console.error("❌ Health check failed:", error);
        newErrors.push("Failed to check API health status");
      }

      // 2. Projects
      try {
        console.log("📡 Loading projects...");
        const projectsResponse = await krapi.admin.listProjects();
        console.log("✅ Projects loaded:", projectsResponse);

        if (projectsResponse.success && projectsResponse.data) {
          const projects = projectsResponse.data;
          newStats.projectsCount = projects.length;
          newStats.activeProjectsCount = projects.filter(
            (p: any) => p.status === "active"
          ).length;

          // Get recent projects
          const recent = projects.slice(0, 5).map((project: any) => ({
            id: project.id,
            name: project.name,
            description: project.description || "No description",
            status: project.status,
            created_at: project.created_at,
            user_count: project.user_count || 0,
          }));
          setRecentProjects(recent);
        }
      } catch (error) {
        console.error("❌ Projects load failed:", error);
        newErrors.push("Failed to load projects");
      }

      // 3. Database Stats
      try {
        console.log("📡 Loading database stats...");
        const dbStatsResponse = await krapi.admin.getDatabaseStats();
        console.log("✅ Database stats loaded:", dbStatsResponse);

        if (dbStatsResponse.success && dbStatsResponse.data) {
          const dbStats = dbStatsResponse.data;
          newStats.totalCollectionsCount = dbStats.collections || 0;
          newStats.totalDocumentsCount = dbStats.documents || 0;
        }
      } catch (error) {
        console.error("❌ Database stats failed:", error);
        newErrors.push("Failed to load database statistics");
      }

      // 4. API Keys
      try {
        console.log("📡 Loading API keys...");
        const keysResponse = await krapi.admin.listApiKeys();
        console.log("✅ API keys loaded:", keysResponse);

        if (keysResponse.success && keysResponse.data) {
          // Could add API key stats here if needed
        }
      } catch (error) {
        console.error("❌ API keys load failed:", error);
        newErrors.push("Failed to load API keys");
      }

      setStats(newStats);
      setLastRefresh(new Date());
      console.log("🎉 Admin dashboard data load completed successfully");
    } catch (error) {
      console.error("❌ Admin dashboard data load failed:", error);
      newErrors.push("Failed to load admin dashboard data");
    } finally {
      setErrors(newErrors);
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return "Never";
    return lastRefresh.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

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
              onClick={loadAdminData}
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
              onClick={loadAdminData}
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
                    <CheckCircle className="h-4 w-4 text-accent-500 dark:text-accent-400 mr-1" />
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
