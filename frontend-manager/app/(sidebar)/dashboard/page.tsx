"use client";

import {
  FolderOpen,
  Users,
  Shield,
  CheckCircle2,
  Plus,
  TrendingUp,
  Database,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Project, Scope } from "@/lib/krapi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjects } from "@/store/projectsSlice";

export default function DashboardPage() {
  const { user, loading, scopes, hasScope } = useReduxAuth();
  const krapi = useKrapi();
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((s) => s.projects);
  const projects = projectsState.items;
  const isLoadingProjects = projectsState.loading;
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalCollections: 0,
    totalDocuments: 0,
  });

  const loadProjects = useCallback(() => {
    dispatch(fetchProjects({ krapi }));
  }, [dispatch, krapi]);

  useEffect(() => {
    if (hasScope(Scope.PROJECTS_READ)) {
      loadProjects();
    }
  }, [loadProjects, scopes, hasScope]);

  useEffect(() => {
    setStats({
      totalProjects: projects.length,
      activeProjects: projects.filter((p: Project) => p.is_active).length,
      totalCollections: 0,
      totalDocuments: 0,
    });
  }, [projects]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map(() => {
            const skeletonId = `dashboard-skeleton-${Math.random()}-${Date.now()}`;
            return (
            <Card key={skeletonId}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to KRAPI Admin.</p>
      </div>
      <div className="rounded-md border p-4">
        <p className="mb-2">Try the new Model Context Protocol (MCP) tools:</p>
        <a href="/mcp" className="text-primary underline">
          Go to Admin MCP
        </a>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Admin dashboard for managing your KRAPI instance
          </p>
        </div>
        {hasScope(Scope.PROJECTS_WRITE) && (
          <Button asChild>
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          </Button>
        )}
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              All projects in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.activeProjects
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects > 0
                ? Math.round((stats.activeProjects / stats.totalProjects) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Collections
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalCollections
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalDocuments
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all collections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Access Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Access Permissions
          </CardTitle>
          <CardDescription>
            Current authentication status and available scopes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Role</p>
              <Badge
                variant={
                  user?.role === "master_admin" ? "default" : "secondary"
                }
              >
                {user?.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Access Level</p>
              <Badge variant="outline">{user?.access_level}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Total Scopes</p>
              <Badge variant="outline">{scopes.length}</Badge>
            </div>
          </div>

          {scopes.includes("master") ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Master Access Enabled</AlertTitle>
              <AlertDescription>
                You have full unrestricted access to all resources and endpoints
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">Available Scopes:</p>
              <div className="flex flex-wrap gap-1">
                {scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingProjects
          ? [...Array(6)].map(() => {
              const skeletonId = `dashboard-project-skeleton-${Math.random()}-${Date.now()}`;
              return (
              <Card key={skeletonId}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
              );
            })
          : projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {project.name}
                  </CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={project.is_active ? "default" : "secondary"}
                    >
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects/${project.id}`}>Manage</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasScope(Scope.PROJECTS_WRITE) && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                asChild
              >
                <Link href="/projects">
                  <Plus className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Create Project</p>
                    <p className="text-sm text-muted-foreground">
                      Start a new project
                    </p>
                  </div>
                </Link>
              </Button>
            )}

            {hasScope(Scope.USERS_READ) && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                asChild
              >
                <Link href="/users">
                  <Users className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Manage Users</p>
                    <p className="text-sm text-muted-foreground">
                      Admin user management
                    </p>
                  </div>
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
              asChild
            >
              <Link href="/test-access">
                <TrendingUp className="h-5 w-5" />
                <div>
                  <p className="font-medium">Test Access</p>
                  <p className="text-sm text-muted-foreground">
                    Test API endpoints
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
