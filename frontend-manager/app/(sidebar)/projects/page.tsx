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
import {
  Plus,
  Settings,
  Trash2,
  Activity,
  Key,
  Users,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Project, Scope } from "@/lib/krapi";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

const editProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;
type EditProjectFormData = z.infer<typeof editProjectSchema>;

export default function ProjectsPage() {
  const { krapi, hasScope } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const createForm = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editForm = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectSchema),
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      editForm.reset({
        name: selectedProject.name,
        description: selectedProject.description || "",
        active: selectedProject.active,
      });
    }
  }, [selectedProject, editForm]);

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

  const createProject = async (data: CreateProjectFormData) => {
    if (!krapi || !hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to create projects");
      return;
    }

    setIsCreating(true);
    try {
      const response = await krapi.projects.create(data);
      if (response.success && response.data) {
        setProjects([...projects, response.data!]);
        toast.success("Project created successfully");
        setIsCreateDialogOpen(false);
        createForm.reset();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const updateProject = async (data: EditProjectFormData) => {
    if (!krapi || !selectedProject || !hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to update projects");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await krapi.projects.update(selectedProject.id, data);
      if (response.success && response.data) {
        setProjects(
          projects.map((p) =>
            p.id === selectedProject.id ? response.data! : p
          )
        );
        toast.success("Project updated successfully");
        setIsEditDialogOpen(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!krapi || !hasScope(Scope.PROJECTS_DELETE)) {
      toast.error("You don't have permission to delete projects");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
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

  const regenerateApiKey = async (projectId: string) => {
    if (!krapi || !hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to regenerate API keys");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to regenerate the API key? The old key will stop working immediately."
      )
    ) {
      return;
    }

    try {
      const response = await krapi.projects.regenerateApiKey(projectId);
      if (response.success && response.data) {
        // Reload projects to get the new API key
        await loadProjects();
        toast.success("API key regenerated successfully");
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      toast.error("Failed to regenerate API key");
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {project.api_key.substring(0, 8)}...
                      </code>
                      <ScopeGuard
                        scopes={Scope.PROJECTS_WRITE}
                        showRequirements={false}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => regenerateApiKey(project.id)}
                          title="Regenerate API Key"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </ScopeGuard>
                    </div>
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
                      scopes={Scope.PROJECTS_WRITE}
                      showRequirements={false}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setIsEditDialogOpen(true);
                        }}
                        title="Edit Project"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </ScopeGuard>
                    <ScopeGuard
                      scopes={Scope.PROJECTS_DELETE}
                      showRequirements={false}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                        title="Delete Project"
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

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new KRAPI project to start building your API
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(createProject)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a unique name for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of your project..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(updateProject)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedProject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
