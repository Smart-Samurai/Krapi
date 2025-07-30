"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  InfoBlock,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/styled";
import {
  FiDatabase,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFile,
  FiFolder,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project, TableSchema } from "@krapi/sdk";

export default function DatabasePage() {
  const krapi = useKrapi();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSchemaOpen, setIsCreateSchemaOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [newSchemaDescription, setNewSchemaDescription] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSchemas();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await krapi.projects.getAll();
      if (response.success && response.data) {
        setProjects(response.data);
        if (response.data.length > 0 && !selectedProject) {
          setSelectedProject(response.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchemas = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const response = await krapi.database.getSchemas(selectedProject);
      if (response.success && response.data) {
        setSchemas(response.data);
      }
    } catch (err) {
      console.error("Error fetching schemas:", err);
      setError("Failed to fetch table schemas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchema = async () => {
    if (!selectedProject || !newSchemaName) return;

    try {
      const response = await krapi.database.createSchema(selectedProject, {
        name: newSchemaName,
        description: newSchemaDescription,
        fields: [
          {
            name: "id",
            type: "string",
            required: true,
            unique: true,
          },
          {
            name: "created_at",
            type: "datetime",
            required: true,
            default: "now()",
          },
          {
            name: "updated_at",
            type: "datetime",
            required: true,
            default: "now()",
          },
        ],
        indexes: [],
      });

      if (response.success) {
        setIsCreateSchemaOpen(false);
        setNewSchemaName("");
        setNewSchemaDescription("");
        fetchSchemas();
      } else {
        setError(response.error || "Failed to create schema");
      }
    } catch (err) {
      console.error("Error creating schema:", err);
      setError("Failed to create table schema");
    }
  };

  const handleDeleteSchema = async (schemaName: string) => {
    if (!selectedProject || !confirm(`Are you sure you want to delete the "${schemaName}" schema?`)) {
      return;
    }

    try {
      const response = await krapi.database.deleteSchema(selectedProject, schemaName);
      if (response.success) {
        fetchSchemas();
      } else {
        setError(response.error || "Failed to delete schema");
      }
    } catch (err) {
      console.error("Error deleting schema:", err);
      setError("Failed to delete table schema");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Database Management</h1>
          <p className="text-text/60 mt-1">
            Manage table schemas and documents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            onClick={() => setIsCreateSchemaOpen(true)}
            disabled={!selectedProject}
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Create Schema
          </Button>
        </div>
      </div>

      {error && (
        <InfoBlock variant="error" title="Error">
          {error}
        </InfoBlock>
      )}

      {/* Schemas Grid */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-text/60">Loading schemas...</p>
        </div>
      ) : schemas.length === 0 ? (
        <div className="text-center py-16 bg-background border border-secondary rounded-lg">
          <FiDatabase className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No schemas yet</h3>
          <p className="text-text/60 mb-4">
            Create your first table schema to start storing data
          </p>
          <Button
            variant="default"
            onClick={() => setIsCreateSchemaOpen(true)}
            disabled={!selectedProject}
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Create Schema
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemas.map((schema) => (
            <div
              key={schema.name}
              className="bg-background border border-secondary rounded-lg p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FiFolder className="h-8 w-8 text-primary mr-3" />
                  <div>
                    <h3 className="font-semibold text-text">{schema.name}</h3>
                    <p className="text-sm text-text/60">
                      {schema.description || "No description"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/database/${selectedProject}/${schema.name}`)}
                  >
                    <FiEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSchema(schema.name)}
                  >
                    <FiTrash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-text/60">Fields: </span>
                  <span className="font-medium text-text">
                    {Object.keys(schema.fields).length}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-text/60">Indexes: </span>
                  <span className="font-medium text-text">
                    {schema.indexes?.length || 0}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-text/60">Created: </span>
                  <span className="font-medium text-text">
                    {new Date(schema.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => router.push(`/database/${selectedProject}/${schema.name}/documents`)}
              >
                <FiFile className="mr-2 h-4 w-4" />
                View Documents
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Schema Dialog */}
      <Dialog open={isCreateSchemaOpen} onOpenChange={setIsCreateSchemaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Table Schema</DialogTitle>
            <DialogDescription>
              Define a new table schema for your project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schema-name">Schema Name</Label>
              <Input
                id="schema-name"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="e.g., users, products, orders"
              />
            </div>
            <div>
              <Label htmlFor="schema-description">Description (optional)</Label>
              <Input
                id="schema-description"
                value={newSchemaDescription}
                onChange={(e) => setNewSchemaDescription(e.target.value)}
                placeholder="Brief description of this schema"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsCreateSchemaOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCreateSchema}
              disabled={!newSchemaName}
            >
              Create Schema
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}