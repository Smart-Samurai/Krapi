/**
 * Projects Page
 * 
 * Main page for listing and managing projects.
 * Provides project creation, editing, deletion, and navigation to project details.
 * 
 * @module app/(sidebar)/projects/page
 * @example
 * // Automatically rendered at /projects route
 */
/**
 * Projects Page
 * 
 * Main page for listing and managing projects.
 * Provides project creation, editing, and deletion functionality.
 * 
 * @module app/(sidebar)/projects/page
 * @example
 * // Automatically rendered at /projects route
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  EmptyState,
  PageHeader,
  FormDialog,
  PageLayout,
  ActionButton,
  CodeSnippet,
} from "@/components/common";
import { ScopeGuard, ScopeIndicator } from "@/components/scope-guard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

/**
 * Create Project Schema
 * 
 * @constant {z.ZodObject}
 */
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

/**
 * Edit Project Schema
 * 
 * @constant {z.ZodObject}
 */
const editProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

/**
 * Create Project Form Data Type
 * 
 * @typedef {z.infer<typeof createProjectSchema>} CreateProjectFormData
 */
type CreateProjectFormData = z.infer<typeof createProjectSchema>;

/**
 * Edit Project Form Data Type
 * 
 * @typedef {z.infer<typeof editProjectSchema>} EditProjectFormData
 */
type EditProjectFormData = z.infer<typeof editProjectSchema>;

/**
 * Projects Page Component
 * 
 * Displays list of projects with create, edit, and delete functionality.
 * Requires authentication and appropriate scopes.
 * 
 * @returns {JSX.Element} Projects page
 */
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
      if (!krapi) {
        toast.error("KRAPI client not initialized");
        return;
      }
      const action = await dispatch(fetchProjects({ krapi }));
      
      if (fetchProjects.rejected.match(action)) {
        const errorMessage = action.payload || action.error?.message || "Unknown error";
        toast.error(`Failed to load projects: ${errorMessage}`);
      }
    } catch (_error: unknown) {
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
      } else if (updateProjectThunk.rejected.match(action)) {
        const errorMessage = action.payload || "Unknown error";
        toast.error(`Failed to update project: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update project: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
      dispatch(endBusy());
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Skeleton className="h-8 w-48" />
        <div 
          className="grid gap-4 w-full max-w-full overflow-x-hidden"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          }}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={`projects-skeleton-card-${i}`} className="min-w-0 max-w-full">
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
      </PageLayout>
    );
  }

  const isBusy = globalBusy > 0;

  return (
    <PageLayout className={isBusy ? "cursor-progress" : ""}>
      <PageHeader
        title="Projects"
        description="Manage your KRAPI projects"
        action={
          <>
            <CodeSnippet context="projects" />
            <ScopeIndicator
              scopes={[Scope.PROJECTS_READ, Scope.PROJECTS_WRITE]}
            />
            <ScopeGuard
              scopes={Scope.PROJECTS_WRITE}
              fallback={
                <ActionButton variant="add" icon={Plus} disabled>
                  Create Project
                </ActionButton>
              }
            >
              <ActionButton
                variant="add"
                icon={Plus}
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={isBusy}
              >
                Create Project
              </ActionButton>
            </ScopeGuard>
          </>
        }
      />

      <ScopeGuard scopes={Scope.PROJECTS_READ}>
        {projects.length === 0 ? (
          <ScopeGuard
            scopes={Scope.PROJECTS_WRITE}
            fallback={
              <EmptyState
                icon={Settings}
                title="No projects yet"
                description="Create your first project to get started"
              />
            }
          >
            <EmptyState
              icon={Settings}
              title="No projects yet"
              description="Create your first project to get started"
              action={{
                label: "Create First Project",
                onClick: () => setIsCreateDialogOpen(true),
                icon: Plus,
              }}
            />
          </ScopeGuard>
        ) : (
          <div 
            className="grid gap-4 w-full max-w-full overflow-x-hidden"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            }}
          >
            {projects.map((project) => (
              <Card
                key={project.id}
                className="krapi-card-hover min-w-0 max-w-full flex flex-col"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="flex-shrink-0 min-w-0">
                  <div className="flex justify-between items-start gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold truncate">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-base line-clamp-2 text-ellipsis overflow-hidden">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={project.is_active ? "default" : "secondary"}
                      className="flex-shrink-0"
                    >
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-shrink-0 mt-auto">
                  <ActionButton
                    variant="outline"
                    icon={ArrowRight}
                    className="w-full"
                  >
                    Enter Project
                  </ActionButton>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScopeGuard>

      {/* Create Project Dialog */}
      <FormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create New Project"
        description="Create a new KRAPI project to start building your API"
        submitLabel="Create Project"
        onSubmit={createForm.handleSubmit(handleCreateProject)}
        isSubmitting={isCreating}
        disabled={isCreating}
      >
        <Form {...createForm}>
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
        </Form>
      </FormDialog>

      {/* Edit Project Dialog */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Edit Project"
        description="Update project details"
        submitLabel="Update Project"
        onSubmit={editForm.handleSubmit(handleUpdateProject)}
        onCancel={() => {
          setIsEditDialogOpen(false);
          setSelectedProject(null);
        }}
        isSubmitting={isUpdating}
        submitClassName="btn-edit"
        disabled={isUpdating}
      >
        <Form {...editForm}>
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
        </Form>
      </FormDialog>
    </PageLayout>
  );
}
