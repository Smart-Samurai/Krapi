"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScopeGuard, ScopeIndicator } from "@/components/scope-guard";
import { toast } from "sonner";
import { Plus, Settings, Trash2, Activity, Key, Users } from "lucide-react";
import { Project, Scope } from "@/lib/krapi";
import Link from "next/link";

export default function ProjectsPage() {
  const { krapi, hasScope } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!krapi || !hasScope(Scope.PROJECTS_READ)) {
      setLoading(false);
      return;
    }

    try {
      const response = await krapi.projects.getAll();
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!krapi || !hasScope(Scope.PROJECTS_DELETE)) {
      toast.error("You don't have permission to delete projects");
      return;
    }

    try {
      const response = await krapi.projects.delete(projectId);
      if (response.success) {
        setProjects(projects.filter((p) => p.id !== projectId));
        toast.success("Project deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your KRAPI projects</p>
        </div>
        <div className="flex items-center gap-4">
          <ScopeIndicator
            scopes={[Scope.PROJECTS_READ, Scope.PROJECTS_WRITE]}
          />
          <ScopeGuard
            scopes={Scope.PROJECTS_WRITE}
            fallback={
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            }
          >
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </ScopeGuard>
        </div>
      </div>

      <ScopeGuard scopes={Scope.PROJECTS_READ}>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <ScopeGuard scopes={Scope.PROJECTS_WRITE}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Project
                </Button>
              </ScopeGuard>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant={project.active ? "default" : "secondary"}>
                      {project.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Key</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {project.api_key.substring(0, 8)}...
                    </code>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/projects/${project.id}/users`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Users className="mr-2 h-4 w-4" />
                        Users
                      </Button>
                    </Link>
                    <Link
                      href={`/collections?project=${project.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Data
                      </Button>
                    </Link>
                    <ScopeGuard
                      scopes={Scope.PROJECTS_DELETE}
                      showRequirements={false}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ScopeGuard>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScopeGuard>
    </div>
  );
}
