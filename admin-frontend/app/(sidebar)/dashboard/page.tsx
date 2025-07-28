"use client";

import React from "react";
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

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Projects",
      value: "N/I",
      change: "N/I",
      changeType: "neutral",
      icon: FiCode,
    },
    {
      title: "Active Users",
      value: "N/I",
      change: "N/I",
      changeType: "neutral",
      icon: FiUsers,
    },
    {
      title: "Database Collections",
      value: "N/I",
      change: "N/I",
      changeType: "neutral",
      icon: FiDatabase,
    },
    {
      title: "Storage Used",
      value: "N/I",
      change: "N/I",
      changeType: "neutral",
      icon: FiFileText,
    },
  ];

  const recentProjects = [
    {
      id: "N/I",
      name: "Not Implemented",
      status: "N/I",
      users: "N/I",
      lastActivity: "N/I",
    },
  ];

  const systemHealth = [
    {
      service: "API Gateway",
      status: "N/I",
      uptime: "N/I",
      responseTime: "N/I",
    },
    {
      service: "Database",
      status: "N/I",
      uptime: "N/I",
      responseTime: "N/I",
    },
    {
      service: "File Storage",
      status: "N/I",
      uptime: "N/I",
      responseTime: "N/I",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text/60 mt-1">
            Welcome back! Here's what's happening with your KRAPI platform.
          </p>
        </div>
        <Button variant="default" size="lg">
          <FiPlus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-background border border-secondary rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text/60">{stat.title}</p>
                <p className="text-2xl font-bold text-text mt-1">
                  {stat.value}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-text/60">
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
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-text">
                Recent Projects
              </h2>
              <TextButton variant="link">View All</TextButton>
            </div>
            <div className="space-y-4">
              {recentProjects.map((project, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-secondary/50 rounded-lg hover:bg-secondary/5 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FiCode className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text">{project.name}</h3>
                      <p className="text-sm text-text/60">
                        {project.users} users • {project.lastActivity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      {project.status}
                    </span>
                    <IconButton
                      icon={FiTrendingUp}
                      variant="secondary"
                      size="sm"
                    />
                  </div>
                </div>
              ))}
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
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
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
                    <span className="text-gray-600">
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
          <Button variant="secondary" className="h-20 flex-col">
            <FiUsers className="h-6 w-6 mb-2" />
            <span className="text-sm">Manage Users</span>
          </Button>
          <Button variant="secondary" className="h-20 flex-col">
            <FiDatabase className="h-6 w-6 mb-2" />
            <span className="text-sm">Database</span>
          </Button>
          <Button variant="secondary" className="h-20 flex-col">
            <FiFileText className="h-6 w-6 mb-2" />
            <span className="text-sm">Files</span>
          </Button>
          <Button variant="secondary" className="h-20 flex-col">
            <FiActivity className="h-6 w-6 mb-2" />
            <span className="text-sm">Analytics</span>
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
              <span className="text-sm font-medium text-gray-600">
                N/I
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm font-medium text-gray-600">
                N/I
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">File Storage</span>
              <span className="text-sm font-medium text-gray-600">
                N/I
              </span>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock
          title="Recent Updates"
          variant="success"
          className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        >
          <div className="space-y-2">
            <div className="text-sm">
              <strong>N/I</strong> - Not Implemented
            </div>
          </div>
        </InfoBlock>
      </div>
    </div>
  );
}
