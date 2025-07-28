"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Button,
  IconButton,
  InfoBlock,
  Input,
} from "@/components/styled";
import {
  FiDatabase,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFile,
  FiMoreVertical,
  FiSettings,
} from "react-icons/fi";

interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  indexes: string[];
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export default function ProjectDatabasePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections();
  }, [projectId]);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const krapi = createDefaultKrapi();
      // When using admin auth, we need to pass projectId explicitly
      const result = await krapi.database.listCollections({ projectId });
      
      if (result.success && result.data) {
        setCollections(result.data);
      } else {
        setError(result.error || "Failed to fetch collections");
      }
    } catch (err) {
      setError("An error occurred while fetching collections");
      console.error("Error fetching collections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/60">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <InfoBlock title="Error" variant="error">
          {error}
        </InfoBlock>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Database</h1>
          <p className="text-text/60 mt-1">
            Manage collections and documents for this project
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="default" size="lg">
            <FiPlus className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Collections</p>
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
              <p className="text-sm font-medium text-text/60">Total Documents</p>
              <p className="text-2xl font-bold text-text mt-1">
                {collections.reduce((sum, col) => sum + col.document_count, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiFile className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Avg Documents/Collection</p>
              <p className="text-2xl font-bold text-text mt-1">
                {collections.length > 0
                  ? Math.round(
                      collections.reduce((sum, col) => sum + col.document_count, 0) /
                        collections.length
                    )
                  : 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiSettings className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">Collections</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {filteredCollections.length === 0 ? (
          <div className="p-12 text-center">
            <FiDatabase className="h-12 w-12 text-text/20 mx-auto mb-4" />
            <p className="text-text/60">
              {searchTerm
                ? "No collections found matching your search"
                : "No collections yet. Create your first collection to get started."}
            </p>
          </div>
        ) : (
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
                      <h3 className="font-medium text-text">{collection.name}</h3>
                      {collection.description && (
                        <p className="text-sm text-text/60 mt-1">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                        <span>{collection.document_count} documents</span>
                        <span>Created: {new Date(collection.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(collection.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Navigate to collection documents
                        window.location.href = `/projects/${projectId}/database/${collection.id}`;
                      }}
                    >
                      View Documents
                    </Button>
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
        )}
      </div>

      {/* Info Block */}
      <InfoBlock
        title="Database Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            Collections are schemas that define the structure of your documents.
            Each collection can have multiple documents with the same structure.
          </p>
          <p>
            <strong>Quick Tips:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Create collections to organize different types of content</li>
            <li>Define schemas to ensure data consistency</li>
            <li>Use relationships to connect documents across collections</li>
          </ul>
        </div>
      </InfoBlock>
    </div>
  );
}