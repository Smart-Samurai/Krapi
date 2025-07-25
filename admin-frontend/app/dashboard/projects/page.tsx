"use client";

import { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Users,
  Database,
  Activity,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { createDefaultKrapi } from "@/lib/krapi";

interface Project {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
  settings?: {
    auth?: {
      enabled: boolean;
      methods: string[];
    };
    storage?: {
      max_file_size: number;
    };
    api?: {
      rate_limit: number;
    };
    database?: {
      max_collections: number;
    };
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    domain: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log("📡 Fetching projects...");
      setLoading(true);

      const krapi = createDefaultKrapi();
      const response = await krapi.admin.listProjects();
      console.log("✅ Projects response:", response);

      if (response.success && response.data) {
        setProjects(response.data);
        console.log(`✅ Loaded ${response.data.length} projects`);
      } else {
        console.error("❌ Failed to fetch projects:", response);
        showError(
          "Failed to fetch projects: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
      showError("Failed to fetch projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      showError("Project name is required");
      return;
    }

    try {
      console.log("📡 Creating project:", newProject);
      setIsCreating(true);

      const krapi = createDefaultKrapi();
      const response = await krapi.admin.createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        domain: newProject.domain.trim() || undefined,
      });

      console.log("✅ Create project response:", response);

      if (response.success && response.data) {
        setProjects([...projects, response.data]);
        setCreateDialogOpen(false);
        setNewProject({ name: "", description: "", domain: "" });
        showSuccess("Project created successfully!");
      } else {
        console.error("❌ Failed to create project:", response);
        showError(
          "Failed to create project: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("❌ Error creating project:", error);
      showError("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (project: Project) => {
    try {
      console.log("📡 Deleting project:", project.id);
      setIsDeleting(true);

      const krapi = createDefaultKrapi();
      const response = await krapi.admin.deleteProject(project.id);
      console.log("✅ Delete project response:", response);

      if (response.success) {
        setProjects(projects.filter((p) => p.id !== project.id));
        setDeleteDialogOpen(false);
        setSelectedProject(null);
        showSuccess("Project deleted successfully!");
      } else {
        console.error("❌ Failed to delete project:", response);
        showError(
          "Failed to delete project: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("❌ Error deleting project:", error);
      showError("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const viewProject = (project: Project) => {
    setSelectedProject(project);
    setViewDialogOpen(true);
  };

  const openProjectSettings = (project: Project) => {
    setSelectedProject(project);
    setSettingsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "inactive":
        return <XCircle className="w-4 h-4" />;
      case "suspended":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-text-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">
            Projects
          </h1>
          <p className="text-text-600 dark:text-text-400">
            Manage your Krapi CMS projects
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your collections and data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="Enter project name"
                  disabled={isCreating}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter project description"
                  disabled={isCreating}
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain (Optional)</Label>
                <Input
                  id="domain"
                  value={newProject.domain}
                  onChange={(e) =>
                    setNewProject({ ...newProject, domain: e.target.value })
                  }
                  placeholder="example.com"
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={createProject}
                disabled={!newProject.name.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="w-12 h-12 text-text-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-text-900 dark:text-text-50">
              No projects yet
            </h3>
            <p className="text-text-600 dark:text-text-400 mb-4">
              Create your first project to get started
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-text-900 dark:text-text-50">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-text-600 dark:text-text-400">
                      {project.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusIcon(project.status)}
                    <span className="ml-1">{project.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.domain && (
                    <div className="flex items-center text-sm text-text-600 dark:text-text-400">
                      <span className="font-medium">Domain:</span>
                      <span className="ml-2">{project.domain}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-text-600 dark:text-text-400">
                      <Database className="w-4 h-4 mr-1" />
                      <span>
                        Collections:{" "}
                        {project.settings?.database?.max_collections ||
                          "Unlimited"}
                      </span>
                    </div>
                    <div className="flex items-center text-text-600 dark:text-text-400">
                      <Activity className="w-4 h-4 mr-1" />
                      <span>
                        Rate: {project.settings?.api?.rate_limit || "Unlimited"}
                        /min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-text-600 dark:text-text-400">
                      <Users className="w-4 h-4 mr-1" />
                      <span>
                        Auth:{" "}
                        {project.settings?.auth?.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center text-text-600 dark:text-text-400">
                      <span>
                        Storage:{" "}
                        {project.settings?.storage?.max_file_size
                          ? `${Math.round(
                              project.settings.storage.max_file_size /
                                1024 /
                                1024
                            )}MB`
                          : "Unlimited"}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-text-500 dark:text-text-400">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openProjectSettings(project)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => viewProject(project)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
            <DialogDescription>View project information</DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-text-600 dark:text-text-400">
                    {selectedProject.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {getStatusIcon(selectedProject.status)}
                    <span className="ml-1">{selectedProject.status}</span>
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-text-600 dark:text-text-400">
                  {selectedProject.description || "No description"}
                </p>
              </div>

              {selectedProject.domain && (
                <div>
                  <Label className="text-sm font-medium">Domain</Label>
                  <p className="text-sm text-text-600 dark:text-text-400">
                    {selectedProject.domain}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-text-600 dark:text-text-400">
                    {new Date(selectedProject.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Updated</Label>
                  <p className="text-sm text-text-600 dark:text-text-400">
                    {new Date(selectedProject.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Settings</Label>
                <div className="mt-2 p-3 bg-background-50 dark:bg-background-100 rounded-md">
                  <pre className="text-xs text-text-600 dark:text-text-400 overflow-auto">
                    {JSON.stringify(selectedProject.settings, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Manage project configuration and settings
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Project Settings</Label>
                <div className="mt-2 p-3 bg-background-50 dark:bg-background-100 rounded-md">
                  <pre className="text-xs text-text-600 dark:text-text-400 overflow-auto">
                    {JSON.stringify(selectedProject.settings, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="text-sm text-text-600 dark:text-text-400">
                <p>Settings management will be available in a future update.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProject && deleteProject(selectedProject)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
