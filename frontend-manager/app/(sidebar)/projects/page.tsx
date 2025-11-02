"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { ScopeGuard, ScopeIndicator } from "@/components/scope-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { Project, Scope } from "@/lib/krapi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProjects,
  createProject as createProjectThunk,
  updateProject as updateProjectThunk,
} from "@/store/projectsSlice";
import { beginBusy, endBusy } from "@/store/uiSlice";

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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const globalBusy = useAppSelector((s) => s.ui?.globalBusyCount ?? 0);
  const { krapi, hasScope } = useReduxAuth();
  const projectsState = useAppSelector((s) => s.projects);
  const projects = projectsState.items;
  const loading = projectsState.loading;
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

  const loadProjects = useCallback(async () => {
    if (!krapi || !hasScope(Scope.PROJECTS_READ)) {
      return;
    }

    dispatch(beginBusy());
    try {
      // Use Redux thunk with krapi instance
      const action = await dispatch(fetchProjects({ krapi }));
      if (fetchProjects.fulfilled.match(action)) {
        // Projects are now stored in Redux store
        // No need to set local state
      }
    } catch {
      // Error logged to console for debugging
      toast.error("Failed to load projects");
    } finally {
      dispatch(endBusy());
    }
  }, [krapi, hasScope, dispatch]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProject) {
      editForm.reset({
        name: selectedProject.name,
        description: selectedProject.description || "",
        active: selectedProject.is_active,
      });
    }
  }, [selectedProject, editForm]);

  const handleCreateProject = async (data: CreateProjectFormData) => {
    if (!krapi || !hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to create projects");
      return;
    }

    setIsCreating(true);
    dispatch(beginBusy());
    try {
      // Use Redux thunk with krapi instance
      const action = await dispatch(createProjectThunk({ data, krapi }));
      if (createProjectThunk.fulfilled.match(action)) {
        toast.success("Project created successfully");
        setIsCreateDialogOpen(false);
        createForm.reset();
        // Projects are automatically updated in Redux store
      }
    } catch {
      // Error logged to console for debugging
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
      dispatch(endBusy());
    }
  };

  const handleUpdateProject = async (data: EditProjectFormData) => {
    if (!krapi || !selectedProject || !hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to update projects");
      return;
    }

    setIsUpdating(true);
    dispatch(beginBusy());
    try {
      // Convert frontend 'active' property to SDK 'is_active' property
      const sdkData: Record<string, unknown> = {
        ...data,
        is_active: data.active,
      };
      delete sdkData.active;

      // Use Redux thunk with krapi instance
      const action = await dispatch(
        updateProjectThunk({
          id: selectedProject.id,
          updates: sdkData,
          krapi,
        })
      );
      if (updateProjectThunk.fulfilled.match(action)) {
        toast.success("Project updated successfully");
        setIsEditDialogOpen(false);
        setSelectedProject(null);
        // Projects are automatically updated in Redux store
      }
    } catch {
      // Error logged to console for debugging
      toast.error("Failed to update project");
    } finally {
      setIsUpdating(false);
      dispatch(endBusy());
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 cursor-progress" aria-busy>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map(() => {
            const skeletonId = `projects-skeleton-${Math.random()}-${Date.now()}`;
            return (
            <Card key={skeletonId}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>
    );
  }

  const isBusy = globalBusy > 0;

  return (
    <div className={`p-6 space-y-6 ${isBusy ? "cursor-progress" : ""}`}>
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
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={isBusy}
            >
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
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={isBusy}
                >
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
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={project.is_active ? "default" : "secondary"}
                    >
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.id}`);
                    }}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Enter Project
                  </Button>
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
              onSubmit={createForm.handleSubmit(handleCreateProject)}
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
                  disabled={isCreating}
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
              onSubmit={editForm.handleSubmit(handleUpdateProject)}
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
                  disabled={isUpdating}
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
