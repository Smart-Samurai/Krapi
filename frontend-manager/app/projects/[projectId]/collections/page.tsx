"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Collection } from "@krapi/sdk";
import { ExtendedCollection } from "@/lib/types/extended";
import { Plus, Database, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectCollectionsPage() {
  const params = useParams();
  const router = useRouter();
  const krapi = useKrapi();
  const projectId = params.projectId as string;

  const [collections, setCollections] = useState<ExtendedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  useEffect(() => {
    if (krapi && projectId) {
      fetchCollections();
    }
  }, [krapi, projectId]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await krapi!.collections.getAll(projectId);
      if (response.success && response.data) {
        setCollections(response.data);
      } else {
        setError(response.error || "Failed to fetch collections");
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName) return;

    try {
      const response = await krapi!.collections.create(projectId, {
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
        setIsCreateDialogOpen(false);
        setNewCollectionName("");
        setNewCollectionDescription("");
        fetchCollections();
      } else {
        setError(response.error || "Failed to create collection");
      }
    } catch (err) {
      console.error("Error creating collection:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create collection";
      setError(errorMessage);
    }
  };

  const handleDeleteCollection = async (collectionName: string) => {
    if (!confirm(`Are you sure you want to delete the "${collectionName}" collection?`)) {
      return;
    }

    try {
      const response = await krapi!.collections.delete(projectId, collectionName);
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
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Collections</h1>
            <p className="text-text/60 mt-2">
              Manage data collections for this project
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2" />
            Create Collection
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Collections Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-text/60">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-text mb-2">
                No collections yet
              </h3>
              <p className="text-text/60 text-center mb-4">
                Create your first collection to start storing data
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2" />
                Create First Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/projects/${projectId}/collections/${collection.name}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        {collection.name}
                      </CardTitle>
                      {collection.description && (
                        <CardDescription className="mt-2">
                          {collection.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${projectId}/collections/${collection.name}/edit`);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection.name);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text/60">Documents</span>
                    <Badge variant="secondary">{collection.document_count || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-text/60">Fields</span>
                    <Badge variant="secondary">{collection.fields?.length || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Collection Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Collections are schemas that define the structure of your documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., users, products, orders"
                />
                <p className="text-xs text-text/60 mt-1">
                  Use lowercase letters, numbers, and underscores only
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Describe what this collection stores..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCollection} disabled={!newCollectionName}>
                Create Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}