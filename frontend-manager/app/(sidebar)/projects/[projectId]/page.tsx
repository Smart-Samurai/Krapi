"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project } from "@/lib/krapi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Users,
  FileText,
  Settings,
  Activity,
  Calendar,
  Globe,
  ArrowRight,
  Edit,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const krapi = useKrapi();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    collections: 0,
    documents: 0,
    users: 0,
    files: 0,
  });

  useEffect(() => {
    if (krapi && projectId) {
      fetchProjectDetails();
    }
  }, [projectId, krapi]);

  const fetchProjectDetails = async () => {
    if (!krapi) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch project details
      const projectResult = await krapi.projects.getById(projectId);

      if (projectResult.success && projectResult.data) {
        setProject(projectResult.data);
      } else {
        setError(projectResult.error || "Failed to fetch project details");
      }

      // Fetch basic stats (you can enhance this later)
      try {
        const collectionsResult = await krapi.collections.getAll(projectId);
        if (collectionsResult.success && collectionsResult.data) {
          setStats((prev) => ({
            ...prev,
            collections: collectionsResult.data?.length || 0,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch collections stats:", err);
      }
    } catch (err) {
      setError("An error occurred while fetching project details");
      console.error("Error fetching project details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert>
        <AlertDescription>Project not found</AlertDescription>
      </Alert>
    );
  }

  const navigationCards = [
    {
      title: "Database",
      description: "Manage collections and documents",
      icon: Database,
      href: `/projects/${projectId}/database`,
      stats: `${stats.collections} collections`,
    },
    {
      title: "Files",
      description: "Upload and manage project files",
      icon: FileText,
      href: `/projects/${projectId}/files`,
      stats: `${stats.files} files`,
    },
    {
      title: "Users",
      description: "Manage project users and permissions",
      icon: Users,
      href: `/projects/${projectId}/users`,
      stats: `${stats.users} users`,
    },
    {
      title: "Settings",
      description: "Configure project settings",
      icon: Settings,
      href: `/projects/${projectId}/settings`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">← Back to Admin</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">← All Projects</Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>Project ID: {project.id}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              Created: {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
          <Badge variant={project.active ? "default" : "secondary"}>
            {project.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.files}</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {navigationCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(card.href as any)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.stats}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recent activity to display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
