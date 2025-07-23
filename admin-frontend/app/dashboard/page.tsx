"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WebSocketStatus from "@/components/WebSocketStatus";
import { unifiedAPI } from "@/lib/unified-api";
import {
  Database,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  FileText,
  AlertCircle,
  Folder,
  Key,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface DashboardStats {
  contentCount: number;
  filesCount: number;
  projectsCount: number;
  apiKeysCount: number;
  collectionsCount: number;
  documentsCount: number;
}

interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

interface RecentItem {
  id: string;
  key: string;
  description?: string;
  updated_at: string;
  type: string;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    contentCount: 0,
    filesCount: 0,
    projectsCount: 0,
    apiKeysCount: 0,
    collectionsCount: 0,
    documentsCount: 0,
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      console.log("User not authenticated, skipping API calls");
      return;
    }

    console.log("🔄 Starting dashboard data load with unified API...");
    setIsLoading(true);
    setErrors([]);

    const newErrors: string[] = [];
    const newStats = { ...stats };
    const allRecentItems: RecentItem[] = [];

    try {
      // 1. Health Check
      try {
        console.log("📡 Checking API health...");
        const healthResponse = await unifiedAPI.health();
        console.log("✅ Health check successful:", healthResponse);
        setHealthStatus(healthResponse);
      } catch (error) {
        console.error("❌ Health check failed:", error);
        newErrors.push("Failed to check API health status");
      }

      // 2. Database Stats (Admin only)
      if (user?.role === "admin") {
        try {
          console.log("📡 Loading database stats...");
          const dbStatsResponse = await unifiedAPI.admin.getDatabaseStats();
          console.log("✅ Database stats loaded:", dbStatsResponse);

          if (dbStatsResponse.success && dbStatsResponse.data) {
            const dbStats = dbStatsResponse.data;
            newStats.collectionsCount = dbStats.collections || 0;
            newStats.documentsCount = dbStats.documents || 0;
          }
        } catch (error) {
          console.error("❌ Database stats failed:", error);
          newErrors.push("Failed to load database statistics");
        }
      }

      // 3. Projects
      try {
        console.log("📡 Loading projects...");
        const projectsResponse = await unifiedAPI.admin.listProjects();
        console.log("✅ Projects loaded:", projectsResponse);

        if (projectsResponse.success && projectsResponse.data) {
          newStats.projectsCount = projectsResponse.data.length || 0;

          // Add recent projects to recent items
          const recentProjects = projectsResponse.data
            .slice(0, 3)
            .map((project: any) => ({
              id: project.id,
              key: project.name,
              description: project.description || "No description",
              updated_at: project.updated_at || project.created_at,
              type: "project",
            }));
          allRecentItems.push(...recentProjects);
        }
      } catch (error) {
        console.error("❌ Projects load failed:", error);
        newErrors.push("Failed to load projects");
      }

      // 4. API Keys (Admin only)
      if (user?.role === "admin") {
        try {
          console.log("📡 Loading API keys...");
          const keysResponse = await unifiedAPI.admin.listApiKeys();
          console.log("✅ API keys loaded:", keysResponse);

          if (keysResponse.success && keysResponse.data) {
            newStats.apiKeysCount = keysResponse.data.length || 0;
          }
        } catch (error) {
          console.error("❌ API keys load failed:", error);
          newErrors.push("Failed to load API keys");
        }
      }

      // 5. Files/Storage
      try {
        console.log("📡 Loading files...");
        const filesResponse = await unifiedAPI.storage.listFiles();
        console.log("✅ Files loaded:", filesResponse);

        if (filesResponse.success && filesResponse.data) {
          newStats.filesCount = filesResponse.data.length || 0;

          // Add recent files to recent items
          const recentFiles = filesResponse.data
            .slice(0, 3)
            .map((file: any) => ({
              id: file.id,
              key: file.name || file.filename,
              description: file.mime_type || "File",
              updated_at: file.updated_at || file.created_at,
              type: "file",
            }));
          allRecentItems.push(...recentFiles);
        }
      } catch (error) {
        console.error("❌ Files load failed:", error);
        newErrors.push("Failed to load files");
      }

      // 6. Content (Documents from collections)
      try {
        console.log("📡 Loading content from collections...");
        const collectionsResponse = await unifiedAPI.database.listCollections();
        console.log("✅ Collections loaded:", collectionsResponse);

        if (collectionsResponse.success && collectionsResponse.data) {
          let totalDocuments = 0;
          const recentDocuments: RecentItem[] = [];

          // Get documents from each collection
          for (const collection of collectionsResponse.data.slice(0, 3)) {
            try {
              const documentsResponse = await unifiedAPI.database.listDocuments(
                collection.id
              );
              if (documentsResponse.success && documentsResponse.data) {
                totalDocuments += documentsResponse.data.length;

                // Add recent documents to recent items
                const recentFromCollection = documentsResponse.data
                  .slice(0, 2)
                  .map((doc: any) => ({
                    id: doc.id,
                    key: doc.title || doc.name || `Document ${doc.id}`,
                    description: `From ${collection.name}`,
                    updated_at: doc.updated_at || doc.created_at,
                    type: "document",
                  }));
                recentDocuments.push(...recentFromCollection);
              }
            } catch (error) {
              console.warn(
                `Failed to load documents from collection ${collection.id}:`,
                error
              );
            }
          }

          newStats.contentCount = totalDocuments;
          allRecentItems.push(...recentDocuments);
        }
      } catch (error) {
        console.error("❌ Content load failed:", error);
        newErrors.push("Failed to load content");
      }

      // Sort and limit recent items
      const sortedRecentItems = allRecentItems
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 8);

      setRecentItems(sortedRecentItems);
      setStats(newStats);
      setLastRefresh(new Date());
      console.log("🎉 Dashboard data load completed successfully");
    } catch (error) {
      console.error("❌ Dashboard data load failed:", error);
      newErrors.push("Failed to load dashboard data");
    } finally {
      setErrors(newErrors);
      setIsLoading(false);
    }
  }, [user?.role]);

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

  const getItemIcon = (type: string) => {
    switch (type) {
      case "project":
        return <Folder className="h-5 w-5 text-blue-400" />;
      case "file":
        return <FileText className="h-5 w-5 text-green-400" />;
      case "document":
        return <Database className="h-5 w-5 text-purple-400" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-400" />;
    }
  };

  // Show loading state while auth is loading or dashboard data is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Loading dashboard...</p>
        </div>
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
                Welcome back, {user?.username}!
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-500">
                Here's what's happening with your Krapi CMS.
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
        {/* Content Items */}
        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Content Items
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {stats.contentCount}
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

        {/* Files */}
        <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-green-400 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Files
                  </dt>
                  <dd className="text-lg font-medium text-text-900">
                    {stats.filesCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Stats (if admin user) */}
      {user?.role === "admin" && (
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

          {/* API Keys */}
          <div className="bg-background-100 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Key className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      API Keys
                    </dt>
                    <dd className="text-lg font-medium text-text-900">
                      {stats.apiKeysCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Collections */}
          <div className="bg-background-100 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      Collections
                    </dt>
                    <dd className="text-lg font-medium text-text-900">
                      {stats.collectionsCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-background-100 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-500 truncate">
                      Documents
                    </dt>
                    <dd className="text-lg font-medium text-text-900">
                      {stats.documentsCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WebSocket Status */}
      <WebSocketStatus />

      {/* Recent Activity */}
      <div className="bg-background-100 dark:bg-background-100 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50">
            Recent Activity
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-500 dark:text-text-500">
            Latest updates across your projects, files, and content.
          </p>
        </div>
        <ul className="divide-y divide-background-200">
          {recentItems.length > 0 ? (
            recentItems.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-primary-600">
                          {item.key}
                        </p>
                        <p className="text-sm text-text-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-text-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li>
              <div className="px-4 py-8 text-center">
                <Database className="mx-auto h-12 w-12 text-text-400" />
                <h3 className="mt-2 text-sm font-medium text-text-900">
                  No recent activity
                </h3>
                <p className="mt-1 text-sm text-text-500">
                  Start creating content, files, or projects to see activity
                  here.
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
              href="/dashboard/content"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Content
            </a>
            <a
              href="/dashboard/files"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Files
            </a>
            <a
              href="/dashboard/api-test"
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Activity className="h-4 w-4 mr-2" />
              Test API
            </a>
            {user?.role === "admin" && (
              <>
                <a
                  href="/dashboard/projects"
                  className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Projects
                </a>
                <a
                  href="/dashboard/database"
                  className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Database
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
