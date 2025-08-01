"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDatabase,
  FiFile,
  FiHash,
  FiCalendar,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project, Collection } from "@/lib/krapi";

export default function CollectionsPage() {
  const router = useRouter();
  const krapi = useKrapi();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  useEffect(() => {
    if (krapi) {
      fetchProjects();
    }
  }, [krapi]);

  useEffect(() => {
    if (selectedProject) {
      fetchCollections();
    }
  }, [selectedProject]);

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

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

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await krapi.collections.getAll(selectedProject);
      if (response.success && response.data) {
        setCollections(response.data);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!selectedProject || !newCollectionName) return;

    try {
      const response = await krapi.collections.create(selectedProject, {
        name: newCollectionName,
        description: newCollectionDescription,
        fields: [
          {
            name: "id",
            type: "string",
            required: true,
            unique: true,
            indexed: true,
            description: "Unique identifier for the document",
          },
          {
            name: "created_at",
            type: "date",
            required: true,
            indexed: true,
            description: "Timestamp when the document was created",
          },
          {
            name: "updated_at",
            type: "date",
            required: true,
            indexed: true,
            description: "Timestamp when the document was last updated",
          },
        ],
      });

      if (response.success) {
        setIsCreateCollectionOpen(false);
        setNewCollectionName("");
        setNewCollectionDescription("");
        fetchCollections();
      } else {
        setError(response.error || "Failed to create collection");
      }
    } catch (err) {
      console.error("Error creating collection:", err);
      setError("Failed to create collection");
    }
  };

  const handleDeleteCollection = async (collectionName: string) => {
    if (
      !selectedProject ||
      !confirm(
        `Are you sure you want to delete the "${collectionName}" collection?`
      )
    ) {
      return;
    }

    try {
      const response = await krapi.collections.delete(
        selectedProject,
        collectionName
      );
      if (response.success) {
        fetchCollections();
      } else {
        setError(response.error || "Failed to delete collection");
      }
    } catch (err) {
      console.error("Error deleting collection:", err);
      setError("Failed to delete collection");
    }
  };

  if (!krapi) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Collections</h1>
        <p className="text-text/60 mt-1">
          Manage data collections for your projects
        </p>
      </div>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[250px]">
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
          onClick={() => setIsCreateCollectionOpen(true)}
          disabled={!selectedProject}
        >
          <FiPlus className="mr-2 h-4 w-4" />
          Create Collection
        </Button>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-text/60">Loading collections...</p>
        </div>
      ) : collections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FiDatabase className="h-12 w-12 text-text/40 mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              No collections yet
            </h3>
            <p className="text-text/60 text-center mb-4">
              Create your first collection to start storing data
            </p>
            <Button
              onClick={() => setIsCreateCollectionOpen(true)}
              disabled={!selectedProject}
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card
              key={collection.name}
              className="hover:border-primary/50 transition-colors cursor-pointer"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <h3 className="font-semibold text-text">{collection.name}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/collections/${selectedProject}/${collection.name}`
                        )
                      }
                    >
                      Manage Fields
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCollection(collection.name)}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text/60 mb-4">
                  {collection.description || "No description"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FiFile className="h-4 w-4 text-text/40" />
                    <span className="text-text/60">Fields:</span>
                    <span className="font-medium">
                      {collection.fields.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiHash className="h-4 w-4 text-text/40" />
                    <span className="text-text/60">Indexes:</span>
                    <span className="font-medium">
                      {collection.indexes?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <FiCalendar className="h-4 w-4 text-text/40" />
                    <span className="text-text/60">Created:</span>
                    <span className="font-medium">
                      {new Date(collection.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() =>
                    router.push(
                      `/collections/${selectedProject}/${collection.name}/documents`
                    )
                  }
                >
                  View Documents
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog
        open={isCreateCollectionOpen}
        onOpenChange={setIsCreateCollectionOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Define a new collection for your project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., users, posts, products"
              />
            </div>
            <div>
              <Label htmlFor="collection-description">
                Description (optional)
              </Label>
              <Textarea
                id="collection-description"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Brief description of this collection"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateCollectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionName}
            >
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
