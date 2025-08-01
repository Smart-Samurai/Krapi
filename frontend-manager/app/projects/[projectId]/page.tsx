"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, InfoBlock, IconButton, TextButton } from "@/components/styled";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FiCode,
  FiUsers,
  FiDatabase,
  FiFileText,
  FiSettings,
  FiActivity,
  FiArrowLeft,
  FiEdit,
  FiTrash2,
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
  const [activeTab, setActiveTab] = useState("overview");

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
        <div className="flex items-center space-x-4">
          <IconButton
            icon={FiArrowLeft}
            variant="secondary"
            onClick={() => router.push("/projects")}
          />
          <div>
            <h1 className="text-3xl font-bold text-text">{project.name}</h1>
            <p className="text-text/60 mt-1">
              {project.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary">
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
          <Button variant="destructive">
            <FiTrash2 className="mr-2 h-4 w-4" />
            Delete
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
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
                    N/A
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">API Secret</p>
                  <code className="text-xs bg-secondary px-2 py-1 rounded">
                    N/A
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
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">User Management</h3>
            <p className="text-text/60">
              Manage users for this specific project.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Database Collections</h3>
            <p className="text-text/60">
              View and manage database collections for this project.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">File Storage</h3>
            <p className="text-text/60">
              Manage files and storage for this project.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
            <p className="text-text/60">
              Configure API settings and view usage statistics.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="bg-background border border-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
            <p className="text-text/60">
              Configure project settings and permissions.
            </p>
          </div>
        </TabsContent>
      </Tabs>
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
