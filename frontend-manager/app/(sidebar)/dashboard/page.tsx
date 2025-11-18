/**
 * Dashboard Page
 * 
 * Main admin dashboard showing system overview, project statistics, and quick actions.
 * 
 * @module app/(sidebar)/dashboard/page
 * @example
 * // Automatically rendered at /dashboard route
 */
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

import { PageLayout, PageHeader, ActionButton } from "@/components/common";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import type { Project } from "@/lib/krapi";
import { Scope } from "@/lib/krapi-constants";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjects } from "@/store/projectsSlice";

/**
 * Dashboard Page Component
 * 
 * Displays admin dashboard with:
 * - Welcome message
 * - System statistics (projects, collections, documents)
 * - Quick action buttons
 * - Recent projects list
 * 
 * Requires authentication and appropriate scopes.
 * 
 * @returns {JSX.Element} Dashboard page
 */
export default function DashboardPage() {
  const { user, loading, scopes, hasScope } = useReduxAuth();
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
    dispatch(fetchProjects({}));
  }, [dispatch]);

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
      <PageLayout>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`dashboard-skeleton-card-${i}`}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={`Welcome back, ${user?.username || "User"}!`}
        description="Admin dashboard for managing your KRAPI instance"
        action={
          hasScope(Scope.PROJECTS_WRITE) ? (
            <ActionButton variant="add" icon={Plus} asChild>
              <Link href="/projects">Create Project</Link>
            </ActionButton>
          ) : null
        }
      />

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">{stats.totalProjects}</div>
            <p className="text-base text-muted-foreground">
              All projects in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Active Projects
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.activeProjects
              )}
            </div>
            <p className="text-base text-muted-foreground">
              {stats.totalProjects > 0
                ? Math.round((stats.activeProjects / stats.totalProjects) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Total Collections
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalCollections
              )}
            </div>
            <p className="text-base text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalDocuments
              )}
            </div>
            <p className="text-base text-muted-foreground">
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
              <p className="text-base font-medium mb-1">Role</p>
              <Badge
                variant={
                  user?.role === "master_admin" ? "default" : "secondary"
                }
              >
                {user?.role}
              </Badge>
            </div>
            <div>
              <p className="text-base font-medium mb-1">Access Level</p>
              <Badge variant="outline">{user?.access_level}</Badge>
            </div>
            <div>
              <p className="text-base font-medium mb-1">Total Scopes</p>
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
              <p className="text-base font-medium mb-2">Available Scopes:</p>
              <div className="flex flex-wrap gap-1">
                {scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-base">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingProjects
            ? Array.from({ length: 6 }, (_, i) => (
                <Card key={`dashboard-project-skeleton-card-${i}`}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </CardContent>
                </Card>
              ))
            : projects.slice(0, 6).map((project) => (
                <Card
                  key={project.id}
                  className="krapi-card-hover"
                >
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={project.is_active ? "default" : "secondary"}
                      >
                        {project.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <ActionButton variant="outline" size="sm" asChild>
                        <Link href={`/projects/${project.id}`}>Manage</Link>
                      </ActionButton>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-base">
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasScope(Scope.PROJECTS_WRITE) && (
              <ActionButton
                variant="outline"
                icon={Plus}
                className="h-auto p-4 flex-col items-start gap-2"
                asChild
              >
                <Link href="/projects" className="flex flex-col items-start gap-2">
                  <div className="font-medium">Create Project</div>
                  <p className="text-base text-muted-foreground">
                    Start a new project
                  </p>
                </Link>
              </ActionButton>
            )}

            {hasScope(Scope.USERS_READ) && (
              <ActionButton
                variant="outline"
                icon={Users}
                className="h-auto p-4 flex-col items-start gap-2"
                asChild
              >
                <Link href="/users" className="flex flex-col items-start gap-2">
                  <div className="font-medium">Manage Users</div>
                  <p className="text-base text-muted-foreground">
                    Admin user management
                  </p>
                </Link>
              </ActionButton>
            )}

            <ActionButton
              variant="outline"
              icon={TrendingUp}
              className="h-auto p-4 flex-col items-start gap-2"
              asChild
            >
              <Link href="/test-access" className="flex flex-col items-start gap-2">
                <div className="font-medium">Test Access</div>
                <p className="text-base text-muted-foreground">
                  Test API endpoints
                </p>
              </Link>
            </ActionButton>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
