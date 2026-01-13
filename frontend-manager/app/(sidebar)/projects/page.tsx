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
import { Plus, ArrowRight, Settings, Search } from "lucide-react";
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
import type { Project } from "@/lib/krapi";
import { Scope } from "@/lib/krapi-constants";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProjects,
  createProject,
  updateProject,
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
  const { hasScope, isInitialized } = useReduxAuth();
  const projectsState = useAppSelector((s) => s.projects);
  const projects = projectsState.items;
  const loading = projectsState.loading;
  
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    // Wait for auth to be initialized before loading projects
    if (!isInitialized) {
      return;
    }

    // Check if user has permission to read projects
    if (!hasScope(Scope.PROJECTS_READ)) {
      return;
    }

    dispatch(beginBusy());
    try {
      // Use Redux thunk which calls the API route
      const action = await dispatch(fetchProjects({}));
      
      if (fetchProjects.rejected.match(action)) {
        const errorMessage = action.payload || action.error?.message || "Unknown error";
        toast.error(`Failed to load projects: ${errorMessage}`);
      }
    } catch (_error: unknown) {
      toast.error("Failed to load projects");
    } finally {
      dispatch(endBusy());
    }
  }, [isInitialized, hasScope, dispatch]);

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
    if (!hasScope(Scope.PROJECTS_WRITE)) {
      toast.error("You don't have permission to create projects");
      return;
    }

    setIsCreating(true);
    dispatch(beginBusy());
    try {
      // Use Redux thunk which calls the API route
      const action = await dispatch(createProject({ data }));
      if (createProject.fulfilled.match(action)) {
        toast.success("Project created successfully");
        setIsCreateDialogOpen(false);
        createForm.reset();
        // Projects are automatically updated in Redux store
      } else if (createProject.rejected.match(action)) {
        const errorMessage = (action.payload as string) || action.error?.message || "Failed to create project";
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create project";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
      dispatch(endBusy());
    }
  };

  const handleUpdateProject = async (data: EditProjectFormData) => {
    if (!selectedProject || !hasScope(Scope.PROJECTS_WRITE)) {
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
        updateProject({
          id: selectedProject.id,
          updates: sdkData,
        })
      );
      if (updateProject.fulfilled.match(action)) {
        toast.success("Project updated successfully");
        setIsEditDialogOpen(false);
        setSelectedProject(null);
        // Projects are automatically updated in Redux store
      } else if (updateProject.rejected.match(action)) {
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

  // Show loading skeleton while projects are loading
  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Projects"
          description="Manage your KRAPI projects"
          action={
            <Skeleton className="h-10 w-32" />
          }
        />
        <div 
          className="grid gap-4 w-full max-w-full overflow-x-hidden"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          }}
          data-testid="projects-container"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={`projects-skeleton-card-${i}`} className="min-w-0 max-w-full" data-testid="projects-skeleton-card">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
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
                data-testid="create-project-button"
              >
                Create Project
              </ActionButton>
            </ScopeGuard>
          </>
        }
      />

      {/* Search Bar */}
      {projects.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search projects by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="projects-search-input"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <ScopeGuard scopes={Scope.PROJECTS_READ}>
        {(() => {
          // Filter projects based on search query
          const filteredProjects = searchQuery
            ? projects.filter(
                (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
              )
            : projects;

          return filteredProjects.length === 0 ? (
            searchQuery ? (
              <EmptyState
                icon={Settings}
                title="No projects found"
                description={`No projects match "${searchQuery}"`}
                data-testid="empty-state-projects-search"
              />
            ) : (
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
              data-testid="empty-state-projects"
            />
          </ScopeGuard>
            )
          ) : (
          <div 
            className="grid gap-4 w-full max-w-full overflow-x-hidden"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            }}
            data-testid="projects-container"
          >
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="krapi-card-hover min-w-0 max-w-full flex flex-col cursor-pointer transition-all hover:shadow-md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/projects/${project.id}`);
                }}
                data-testid="project-card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/projects/${project.id}`);
                  }
                }}
                aria-label={`View project ${project.name}`}
              >
                <CardHeader className="flex-shrink-0 min-w-0">
                  <div className="flex justify-between items-start gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold truncate" data-testid="project-name">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-base line-clamp-2 text-ellipsis overflow-hidden" data-testid="project-description">
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
                    onClick={() => {
                      router.push(`/projects/${project.id}`);
                    }}
                  >
                    Enter Project
                  </ActionButton>
                </CardContent>
              </Card>
              ))}
            </div>
          );
        })()}
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
        data-testid="create-project-dialog"
        onCancel={() => setIsCreateDialogOpen(false)}
      >
        <Form {...createForm}>
          <FormField
            control={createForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Awesome Project" {...field} data-testid="project-form-name" />
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
                    data-testid="project-form-description"
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
        data-testid="edit-project-dialog"
      >
        <Form {...editForm}>
          <FormField
            control={editForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="project-edit-form-name" />
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
                  <Textarea {...field} data-testid="project-edit-form-description" />
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
