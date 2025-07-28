"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  InfoBlock,
  IconButton,
  TextButton,
  ExpandableList,
} from "@/components/styled";
import {
  FiUsers,
  FiDatabase,
  FiFileText,
  FiActivity,
  FiCode,
  FiShield,
  FiMail,
  FiPlus,
  FiTrendingUp,
  FiServer,
  FiGlobe,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { useRouter } from "next/navigation";

interface DashboardStats {
  totalProjects: number;
  activeUsers: number;
  databaseCollections: number;
  storageUsed: string;
}

interface SystemHealthItem {
  service: string;
  status: "healthy" | "warning" | "error";
  uptime: string;
  responseTime: string;
}

export default function DashboardPage() {
  const krapi = useKrapi();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeUsers: 0,
    databaseCollections: 0,
    storageUsed: "0 GB",
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch admin stats
      const statsResponse = await krapi.admin.getStats();
      if (statsResponse.success && statsResponse.data) {
        const data = statsResponse.data;
        setStats({
          totalProjects: data.projects?.total || 0,
          activeUsers: data.users?.active || 0,
          databaseCollections: data.database?.collections || 0,
          storageUsed: formatBytes(data.storage?.used || 0),
        });
      }

      // Fetch system health
      const healthResponse = await krapi.client.health();
      if (healthResponse.success) {
        const healthData = healthResponse.data as any; // Type assertion for now
        setSystemHealth([
          {
            service: "API Gateway",
            status: healthData?.api?.status === "ok" ? "healthy" : "error",
            uptime: healthData?.api?.uptime || "0%",
            responseTime: healthData?.api?.responseTime || "N/A",
          },
          {
            service: "Database",
            status: healthData?.database?.status === "ok" ? "healthy" : "error",
            uptime: healthData?.database?.uptime || "0%",
            responseTime: healthData?.database?.responseTime || "N/A",
          },
          {
            service: "File Storage",
            status:
              healthData?.storage?.status === "ok" ? "healthy" : "warning",
            uptime: healthData?.storage?.uptime || "0%",
            responseTime: healthData?.storage?.responseTime || "N/A",
          },
        ]);
      }

      // Fetch recent activity
      const activityResponse = await krapi.admin.getActivity({ limit: 5 });
      if (activityResponse.success && activityResponse.data) {
        setRecentActivity(activityResponse.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 GB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const statsDisplay = [
    {
      title: "Total Projects",
      value: stats.totalProjects.toString(),
      change: "+0",
      changeType: "positive" as const,
      icon: FiCode,
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toString(),
      change: "+0%",
      changeType: "positive" as const,
      icon: FiUsers,
    },
    {
      title: "Database Collections",
      value: stats.databaseCollections.toString(),
      change: "+0",
      changeType: "positive" as const,
      icon: FiDatabase,
    },
    {
      title: "Storage Used",
      value: stats.storageUsed,
      change: "+0 GB",
      changeType: "positive" as const,
      icon: FiFileText,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Admin Dashboard</h1>
          <p className="text-text/60 mt-1">
            System-wide overview and management
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          onClick={() => router.push("/projects")}
        >
          <FiPlus className="mr-2 h-4 w-4" />
          View Projects
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat, index) => (
          <div
            key={index}
            className="bg-background border border-secondary rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text/60">{stat.title}</p>
                <p className="text-2xl font-bold text-text mt-1">
                  {loading ? "..." : stat.value}
                </p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : stat.changeType === "negative"
                        ? "text-red-600"
                        : "text-text/60"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-text/40 ml-1">
                    from last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-text">
                Recent Activity
              </h2>
              <TextButton
                variant="link"
                onClick={() => router.push("/projects")}
              >
                View All Projects
              </TextButton>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-text/60">Loading...</p>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-secondary/50 rounded-lg hover:bg-secondary/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FiActivity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-text">
                          {activity.action}
                        </h3>
                        <p className="text-sm text-text/60">
                          {activity.resource} • {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text/60 text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div>
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h2 className="text-xl font-semibold text-text mb-4">
              System Health
            </h2>
            <div className="space-y-4">
              {systemHealth.map((service, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          service.status === "healthy"
                            ? "bg-green-500"
                            : service.status === "warning"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="font-medium text-text">
                        {service.service}
                      </span>
                    </div>
                    <span className="text-sm text-text/60">
                      {service.responseTime}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-text/60">
                    <span>Uptime: {service.uptime}</span>
                    <span
                      className={
                        service.status === "healthy"
                          ? "text-green-600"
                          : service.status === "warning"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
                    >
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="secondary"
            className="h-20 flex-col"
            onClick={() => router.push("/users")}
          >
            <FiUsers className="h-6 w-6 mb-2" />
            <span className="text-sm">Manage Users</span>
          </Button>
          <Button
            variant="secondary"
            className="h-20 flex-col"
            onClick={() => router.push("/database" as any)}
          >
            <FiDatabase className="h-6 w-6 mb-2" />
            <span className="text-sm">Database</span>
          </Button>
          <Button
            variant="secondary"
            className="h-20 flex-col"
            onClick={() => router.push("/files" as any)}
          >
            <FiFileText className="h-6 w-6 mb-2" />
            <span className="text-sm">Files</span>
          </Button>
          <Button
            variant="secondary"
            className="h-20 flex-col"
            onClick={() => router.push("/health")}
          >
            <FiActivity className="h-6 w-6 mb-2" />
            <span className="text-sm">System Health</span>
          </Button>
        </div>
      </div>

      {/* Info Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoBlock
          title="Platform Status"
          variant="info"
          className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Endpoints</span>
              <span className="text-sm font-medium text-green-600">
                All Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm font-medium text-green-600">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">File Storage</span>
              <span className="text-sm font-medium text-yellow-600">
                Available
              </span>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock
          title="System Information"
          variant="success"
          className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        >
          <div className="space-y-2">
            <div className="text-sm">
              <strong>KRAPI Version</strong> - v1.0.0
            </div>
            <div className="text-sm">
              <strong>Node.js</strong> - {process.version || "N/A"}
            </div>
            <div className="text-sm">
              <strong>Environment</strong> -{" "}
              {process.env.NODE_ENV || "development"}
            </div>
          </div>
        </InfoBlock>
      </div>
    </div>
  );
}
