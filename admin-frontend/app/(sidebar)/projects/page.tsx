"use client";

import React, { useState } from "react";
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
} from "react-icons/fi";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  projectId: z.string().min(1, "Project ID is required"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const projects = [
    {
      id: "N/I",
      name: "Not Implemented",
      description: "N/I",
      status: "N/I",
      users: 0,
      collections: 0,
      storage: "0 GB",
      lastActivity: "N/I",
      createdAt: "N/I",
    },
  ];

  const handleCreateProject = async (data: ProjectFormData) => {
    console.log("Creating project:", data);
    setIsCreateDialogOpen(false);
    // Here you would typically make an API call
  };

  const getStatusColor = (status: string) => {
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

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
                name="projectId"
                label="Project ID"
                type="text"
                placeholder="Enter unique project ID"
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Projects
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
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
          <h2 className="text-xl font-semibold text-text">All Projects</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {projects.map((project) => (
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
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">
                      {project.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>{project.users} users</span>
                      <span>{project.collections} collections</span>
                      <span>{project.storage} storage</span>
                      <span>Created {project.createdAt}</span>
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
                    icon={FiMoreVertical}
                    variant="secondary"
                    size="sm"
                    title="More Options"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
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
