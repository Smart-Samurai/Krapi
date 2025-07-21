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
import { Plus, Settings, Users, Database, Activity } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { projectAPI } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
  settings: {
    auth: {
      enabled: boolean;
      methods: string[];
    };
    storage: {
      max_file_size: number;
    };
    api: {
      rate_limit: number;
    };
    database: {
      max_collections: number;
    };
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    domain: "",
  });
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      showError("Error fetching projects");
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    try {
      const response = await projectAPI.createProject(newProject);
      if (response.success && response.data) {
        setProjects([...projects, response.data]);
      }
      setCreateDialogOpen(false);
      setNewProject({ name: "", description: "", domain: "" });
      showSuccess("Project created successfully");
    } catch (error) {
      showError("Error creating project");
      console.error("Error creating project:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage your Krapi CMS projects</p>
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
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="Enter project name"
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!newProject.name}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">
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
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.domain && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Domain:</span>
                      <span className="ml-2">{project.domain}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Database className="w-4 h-4 mr-1" />
                      <span>
                        Collections: {project.settings.database.max_collections}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Activity className="w-4 h-4 mr-1" />
                      <span>Rate: {project.settings.api.rate_limit}/min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-1" />
                      <span>
                        Auth:{" "}
                        {project.settings.auth.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span>
                        Storage:{" "}
                        {Math.round(
                          project.settings.storage.max_file_size / 1024 / 1024
                        )}
                        MB
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                  <Button size="sm" className="flex-1">
                    View Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
