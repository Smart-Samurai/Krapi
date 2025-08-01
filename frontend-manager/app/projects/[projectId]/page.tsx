"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, InfoBlock } from "@/components/styled";
import {
  FiCode,
  FiUsers,
  FiDatabase,
  FiFileText,
  FiSettings,
  FiActivity,
  FiKey,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Project } from "@/lib/krapi";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const krapi = useKrapi();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (projectId && krapi) {
      fetchProjectDetails();
    }
  }, [projectId, krapi]);

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await krapi.projects.getById(projectId);
      if (response.success && response.data) {
        setProject(response.data as Project);
      } else {
        // Project not found
        router.push("/projects");
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-text/60">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-text/60">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">{project.name}</h1>
          <p className="text-text/60 mt-1">
            {project.description || "No description"}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="secondary"
            onClick={() => router.push(`/projects/${projectId}/settings`)}
          >
            <FiSettings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Users</p>
              <p className="text-2xl font-bold text-text mt-1">0</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiUsers className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Collections</p>
              <p className="text-2xl font-bold text-text mt-1">0</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiDatabase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Storage</p>
              <p className="text-2xl font-bold text-text mt-1">0</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiFileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">API Calls</p>
              <p className="text-2xl font-bold text-text mt-1">0</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiActivity className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/* Project Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoBlock
          title="API Credentials"
          variant="info"
          className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        >
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">API Key</p>
              <code className="text-xs bg-secondary px-2 py-1 rounded">
                {project.api_key ? project.api_key.substring(0, 8) + "..." : "N/A"}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium">API Endpoint</p>
              <code className="text-xs bg-secondary px-2 py-1 rounded">
                /krapi/k1/projects/{project.id}
              </code>
            </div>
          </div>
        </InfoBlock>

        <InfoBlock title="Project Information" variant="default">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Status</span>
              <span
                className={`text-sm font-medium ${
                  project.active ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {project.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Created</span>
              <span className="text-sm font-medium">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Project ID</span>
              <span className="text-sm font-medium">{project.id}</span>
            </div>
          </div>
        </InfoBlock>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-auto p-6 justify-start"
          onClick={() => router.push(`/projects/${projectId}/collections`)}
        >
          <FiDatabase className="mr-3 h-5 w-5" />
          <div className="text-left">
            <p className="font-medium">Manage Collections</p>
            <p className="text-sm text-text/60">Create and manage data schemas</p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto p-6 justify-start"
          onClick={() => router.push(`/projects/${projectId}/users`)}
        >
          <FiUsers className="mr-3 h-5 w-5" />
          <div className="text-left">
            <p className="font-medium">Manage Users</p>
            <p className="text-sm text-text/60">Control project access</p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto p-6 justify-start"
          onClick={() => router.push(`/projects/${projectId}/api-keys`)}
        >
          <FiKey className="mr-3 h-5 w-5" />
          <div className="text-left">
            <p className="font-medium">API Keys</p>
            <p className="text-sm text-text/60">Manage API authentication</p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
