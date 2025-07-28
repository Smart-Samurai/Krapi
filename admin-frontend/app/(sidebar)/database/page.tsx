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
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  FiPlus,
  FiDatabase,
  FiEdit,
  FiTrash2,
  FiEye,
  FiSearch,
  FiFileText,
  FiSettings,
} from "react-icons/fi";

const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  project: z.string().min(1, "Project is required"),
  description: z.string().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function DatabasePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const collections = [
    {
      id: "N/I",
      name: "Not Implemented",
      project: "N/I",
      documents: 0,
      size: "0 MB",
      lastModified: "N/I",
      status: "N/I",
    },
  ];

  const projects = [
    { value: "N/I", label: "Not Implemented" },
  ];

  const handleCreateCollection = async (data: CollectionFormData) => {
    console.log("Creating collection:", data);
    setIsCreateDialogOpen(false);
  };

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Database</h1>
          <p className="text-text/60 mt-1">
            Manage your database collections and documents
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg">
              <FiPlus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Create a new database collection for your project
              </DialogDescription>
            </DialogHeader>
            <Form
              schema={collectionSchema}
              onSubmit={handleCreateCollection}
              className="space-y-4"
            >
              <FormField
                name="name"
                label="Collection Name"
                type="text"
                placeholder="Enter collection name"
                required
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">
                  Project
                </label>
                <Select name="project" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.value} value={project.value}>
                        {project.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField
                name="description"
                label="Description"
                type="textarea"
                placeholder="Optional collection description"
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
                  Create Collection
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Collections
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiDatabase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Documents
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiFileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Database Size
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiDatabase className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Active Queries
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiSettings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">All Collections</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredCollections.map((collection, index) => (
            <div
              key={index}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiDatabase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">
                        {collection.name}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                        {collection.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">
                      Project: {collection.project}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>{collection.documents} documents</span>
                      <span>{collection.size}</span>
                      <span>Modified {collection.lastModified}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiEye}
                    variant="secondary"
                    size="sm"
                    title="View Collection"
                  />
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit Collection"
                  />
                  <IconButton
                    icon={FiTrash2}
                    variant="secondary"
                    size="sm"
                    title="Delete Collection"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredCollections.length === 0 && (
        <div className="bg-background border border-secondary rounded-lg p-12 text-center">
          <FiDatabase className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            No collections found
          </h3>
          <p className="text-text/60 mb-4">
            {searchQuery
              ? "Try adjusting your search query"
              : "Create your first collection to get started"}
          </p>
          {!searchQuery && (
            <Button
              variant="default"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          )}
        </div>
      )}

      {/* Info Block */}
      <InfoBlock
        title="Database Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI provides a flexible NoSQL database for your applications.
            Collections are schema-less and can store any JSON document.
          </p>
          <p>
            Each collection is isolated to a specific project and can be
            configured with custom indexes and validation rules.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
