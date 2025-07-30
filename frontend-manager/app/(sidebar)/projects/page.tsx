"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  InfoBlock,
  IconButton,
  TextButton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  FiPlus,
  FiCode,
  FiUsers,
  FiDatabase,
  FiFileText,
  FiSettings,
  FiTrash2,
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiSearch,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project } from "@krapi/sdk";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const krapi = useKrapi();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await krapi.projects.getAll();
      
      if (result.success && result.data) {
        setProjects(result.data);
      } else {
        setError(result.error || "Failed to fetch projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("An error occurred while fetching projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (data: ProjectFormData) => {
    setError(null);
    
    try {
      const result = await krapi.projects.create({
        name: data.name,
        description: data.description || "",
      });
      
      if (result.success) {
        setIsCreateDialogOpen(false);
        // Refresh projects list
        await fetchProjects();
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError("An error occurred while creating the project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }
    
    try {
      const result = await krapi.projects.delete(projectId);
      
      if (result.success) {
        // Refresh projects list
        await fetchProjects();
      } else {
        setError(result.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setError("An error occurred while deleting the project");
    }
  };

  const getStatusColor = (active: boolean) => {
    if (active) {
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    } else {
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/60">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Projects</h1>
          <p className="text-text/60 mt-1">
            Manage your projects and their configurations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg">
              <FiPlus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your backend resources
              </DialogDescription>
            </DialogHeader>
            <Form
              schema={projectSchema}
              onSubmit={handleCreateProject}
              className="space-y-4"
            >
              <FormField
                name="name"
                label="Project Name"
                type="text"
                placeholder="Enter project name"
                required
              />

              <FormField
                name="description"
                label="Description"
                type="textarea"
                placeholder="Optional project description"
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Create Project
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <InfoBlock title="Error" variant="error">
          {error}
        </InfoBlock>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Projects
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {projects.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiCode className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Users</p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiUsers className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Collections
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiDatabase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Storage Used</p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiFileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">All Projects</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <FiCode className="h-12 w-12 text-text/20 mx-auto mb-4" />
            <p className="text-text/60">
              {searchTerm
                ? "No projects found matching your search"
                : "No projects yet. Create your first project to get started."}
            </p>
          </div>
        ) : (
        <div className="divide-y divide-secondary/50">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiCode className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{project.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          project.active
                        )}`}
                      >
                        {project.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-sm text-text/60 mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>ID: {project.id}</span>
                      <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/projects/${project.id}/database`;
                    }}
                  >
                    Open Project
                  </Button>
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit Project"
                  />
                  <IconButton
                    icon={FiSettings}
                    variant="secondary"
                    size="sm"
                    title="Project Settings"
                  />
                  <IconButton
                    icon={FiTrash2}
                    variant="secondary"
                    size="sm"
                    title="Delete Project"
                    onClick={() => handleDeleteProject(project.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="bg-background border border-secondary rounded-lg p-12 text-center">
          <FiCode className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            No projects yet
          </h3>
          <p className="text-text/60 mb-4">
            Create your first project to get started
          </p>
          <Button variant="default" onClick={() => setIsCreateDialogOpen(true)}>
            <FiPlus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      )}
    </div>
  );
}
