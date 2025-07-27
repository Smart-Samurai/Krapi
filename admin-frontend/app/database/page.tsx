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
  FiDatabase,
  FiTable,
  FiFileText,
  FiSettings,
  FiEdit,
  FiTrash2,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiDownload,
  FiUpload,
} from "react-icons/fi";

const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
  projectId: z.string().min(1, "Project is required"),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function DatabasePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const collections = [
    {
      id: "col-001",
      name: "users",
      description: "User accounts and profiles",
      project: "E-commerce Platform",
      documents: 1247,
      size: "2.3 MB",
      lastModified: "2 hours ago",
      status: "active",
    },
    {
      id: "col-002",
      name: "products",
      description: "Product catalog and inventory",
      project: "E-commerce Platform",
      documents: 892,
      size: "1.8 MB",
      lastModified: "1 hour ago",
      status: "active",
    },
    {
      id: "col-003",
      name: "orders",
      description: "Customer orders and transactions",
      project: "E-commerce Platform",
      documents: 567,
      size: "3.1 MB",
      lastModified: "30 minutes ago",
      status: "active",
    },
    {
      id: "col-004",
      name: "analytics",
      description: "Analytics data and metrics",
      project: "Analytics Dashboard",
      documents: 234,
      size: "0.9 MB",
      lastModified: "1 day ago",
      status: "active",
    },
  ];

  const handleCreateCollection = async (data: CollectionFormData) => {
    console.log("Creating collection:", data);
    setIsCreateDialogOpen(false);
    // Here you would typically make an API call
  };

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Database</h1>
          <p className="text-text/60 mt-1">
            Manage database collections and data
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiUpload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="secondary">
            <FiDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
                <DialogDescription>
                  Create a new database collection for storing data
                </DialogDescription>
              </DialogHeader>
              <Form schema={collectionSchema} onSubmit={handleCreateCollection}>
                <div className="space-y-4">
                  <FormField
                    name="name"
                    label="Collection Name"
                    type="text"
                    placeholder="Enter collection name"
                    required
                  />
                  <FormField
                    name="projectId"
                    label="Project"
                    type="select"
                    options={[
                      { value: "proj-001", label: "E-commerce Platform" },
                      { value: "proj-002", label: "Mobile App Backend" },
                      { value: "proj-003", label: "Analytics Dashboard" },
                    ]}
                    required
                  />
                  <FormField
                    name="description"
                    label="Description"
                    type="textarea"
                    placeholder="Optional collection description"
                  />
                </div>
                <DialogFooter className="mt-6">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Total Collections
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {collections.length}
              </p>
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
              <p className="text-2xl font-bold text-text mt-1">
                {collections
                  .reduce((sum, c) => sum + c.documents, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiFileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Size</p>
              <p className="text-2xl font-bold text-text mt-1">
                {collections
                  .reduce((sum, c) => {
                    const size = parseFloat(c.size);
                    return sum + size;
                  }, 0)
                  .toFixed(1)}{" "}
                MB
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiTable className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Active Collections
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {collections.filter((c) => c.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiSettings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="secondary">
            <FiFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">All Collections</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredCollections.map((collection) => (
            <div
              key={collection.id}
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
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {collection.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">
                      {collection.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Project: {collection.project}</span>
                      <span>
                        {collection.documents.toLocaleString()} documents
                      </span>
                      <span>{collection.size} size</span>
                      <span>Modified {collection.lastModified}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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

      {/* Info Block */}
      <InfoBlock
        title="Database Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            Collections are the primary way to organize data in KRAPI. Each
            collection can contain multiple documents and supports complex
            queries and indexing.
          </p>
          <p>
            <strong>Documents:</strong> Individual records stored in collections
          </p>
          <p>
            <strong>Size:</strong> Total storage space used by the collection
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
