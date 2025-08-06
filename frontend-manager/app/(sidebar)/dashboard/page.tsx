"use client";

import { useState, useEffect } from "react";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project } from "@/lib/krapi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
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
import { Scope } from "@/lib/krapi";

export default function DashboardPage() {
  const { user, loading, scopes, hasScope, hasMasterAccess } = useReduxAuth();
  const krapi = useKrapi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalCollections: 0,
    totalDocuments: 0,
  });

  useEffect(() => {
    if (krapi && hasScope(Scope.PROJECTS_READ)) {
      loadProjects();
    }
  }, [krapi, scopes]); // Use scopes instead of hasScope since hasScope is now memoized

  const loadProjects = async () => {
    if (!krapi?.projects) return;

    setIsLoadingProjects(true);
    try {
      const result = await krapi.projects.getAll();
      if (result.success && result.data) {
        setProjects(result.data);
        setStats({
          totalProjects: result.data.length,
          activeProjects: result.data.filter((p: Project) => p.active).length,
          totalCollections: 0, // Will be calculated later
          totalDocuments: 0, // Will be calculated later
        });
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      // Note: Authentication errors are automatically handled by the enhanced useKrapi hook
      // and will redirect to login page. For other errors, you can handle them here.
    } finally {
      setIsLoadingProjects(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <div className="text-2xl font-bold">
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalProjects
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} active
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

          {hasMasterAccess() ? (
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

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Projects
          </CardTitle>
          <CardDescription>
            Your most recently created or updated projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProjects ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No projects found</p>
              {hasScope(Scope.PROJECTS_WRITE) && (
                <Button asChild>
                  <Link href="/projects">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Project
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Created{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={project.active ? "default" : "secondary"}>
                      {project.active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>View Project</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {projects.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="outline" asChild>
                    <Link href="/projects">View All Projects</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
