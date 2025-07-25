"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Database,
  Users,
  FileText,
  Settings,
  Activity,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  settings?: any;
}

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📡 Loading project:", projectId);
      const krapi = createDefaultKrapi();
      const response = await krapi.admin.getProject(projectId);

      if (response.success && response.data) {
        setProject(response.data);
        console.log("✅ Project loaded:", response.data);
      } else {
        setError("Failed to load project");
        console.error("❌ Failed to load project:", response);
      }
    } catch (error) {
      console.error("❌ Error loading project:", error);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-2">
            Project Not Found
          </h3>
          <p className="text-text-600 dark:text-text-400">
            {error || "The requested project could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-400">
                {project.description || "No description"}
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                  {project.status}
                </span>
                <span className="text-xs text-text-400">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Project Users
                  </dt>
                  <dd className="text-lg font-medium text-text-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Collections
                  </dt>
                  <dd className="text-lg font-medium text-text-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    Files
                  </dt>
                  <dd className="text-lg font-medium text-text-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background-100 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-500 truncate">
                    API Calls
                  </dt>
                  <dd className="text-lg font-medium text-text-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background-100 dark:bg-background-100 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-text-900 dark:text-text-50 mb-4">
            Project Management
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href={`/projects/${projectId}/users`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </a>
            <a
              href={`/projects/${projectId}/database`}
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Database className="h-4 w-4 mr-2" />
              Database
            </a>
            <a
              href={`/projects/${projectId}/files`}
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Files
            </a>
            <a
              href={`/projects/${projectId}/settings`}
              className="inline-flex items-center px-4 py-2 border border-background-300 text-sm font-medium rounded-md text-text-700 bg-background-50 hover:bg-background-100 dark:text-text-300 dark:bg-background-100 dark:hover:bg-background-200 dark:border-background-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
