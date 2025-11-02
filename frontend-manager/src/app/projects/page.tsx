"use client";

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Database,
  FileText,
  Settings,
  Users,
  Key,
  Mail,
  Upload,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  collections_count?: number;
  documents_count?: number;
}

interface Collection {
  id: string;
  project_id: string;
  name: string;
  description: string;
  fields: any[];
  indexes: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  documents_count?: number;
}

interface Document {
  id: string;
  collection_id: string;
  data: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showCreateDocument, setShowCreateDocument] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    fields: [],
  });
  const [newDocument, setNewDocument] = useState({ data: {} });

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/krapi/k1/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchCollections = async (projectId: string) => {
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/collections`
      );
      if (!response.ok) throw new Error("Failed to fetch collections");
      const data = await response.json();
      setCollections(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchDocuments = async (projectId: string, collectionId: string) => {
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/collections/${collectionId}/documents`
      );
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createProject = async () => {
    try {
      const response = await fetch("/api/krapi/k1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (!response.ok) throw new Error("Failed to create project");
      await fetchProjects();
      setShowCreateProject(false);
      setNewProject({ name: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createCollection = async () => {
    if (!selectedProject) return;
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${selectedProject.id}/collections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCollection),
        }
      );
      if (!response.ok) throw new Error("Failed to create collection");
      await fetchCollections(selectedProject.id);
      setShowCreateCollection(false);
      setNewCollection({ name: "", description: "", fields: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createDocument = async () => {
    if (!selectedProject || !selectedCollection) return;
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${selectedProject.id}/collections/${selectedCollection.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDocument),
        }
      );
      if (!response.ok) throw new Error("Failed to create document");
      await fetchDocuments(selectedProject.id, selectedCollection.id);
      setShowCreateDocument(false);
      setNewDocument({ data: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const response = await fetch(`/api/krapi/k1/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      await fetchProjects();
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setCollections([]);
        setDocuments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (
      !selectedProject ||
      !confirm("Are you sure you want to delete this collection?")
    )
      return;
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${selectedProject.id}/collections/${collectionId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete collection");
      await fetchCollections(selectedProject.id);
      if (selectedCollection?.id === collectionId) {
        setSelectedCollection(null);
        setDocuments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (
      !selectedProject ||
      !selectedCollection ||
      !confirm("Are you sure you want to delete this document?")
    )
      return;
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${selectedProject.id}/collections/${selectedCollection.id}/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete document");
      await fetchDocuments(selectedProject.id, selectedCollection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProjects();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchCollections(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && selectedCollection) {
      fetchDocuments(selectedProject.id, selectedCollection.id);
    }
  }, [selectedProject, selectedCollection]);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-gray-600">
            Manage your KRAPI projects, collections, and documents
          </p>
        </div>
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your data collections.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateProject(false)}
              >
                Cancel
              </Button>
              <Button onClick={createProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="collections" disabled={!selectedProject}>
            Collections
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            disabled={!selectedProject || !selectedCollection}
          >
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProject?.id === project.id
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Created:{" "}
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant="outline">
                      {project.collections_count || 0} collections
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No projects match your search."
                  : "Get started by creating your first project."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateProject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          {selectedProject && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Collections in {selectedProject.name}
                  </h2>
                  <p className="text-gray-600">
                    Manage data collections and schemas
                  </p>
                </div>
                <Dialog
                  open={showCreateCollection}
                  onOpenChange={setShowCreateCollection}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Collection
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Collection</DialogTitle>
                      <DialogDescription>
                        Create a new collection to define your data schema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="collection-name">Collection Name</Label>
                        <Input
                          id="collection-name"
                          value={newCollection.name}
                          onChange={(e) =>
                            setNewCollection({
                              ...newCollection,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter collection name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="collection-description">
                          Description
                        </Label>
                        <Textarea
                          id="collection-description"
                          value={newCollection.description}
                          onChange={(e) =>
                            setNewCollection({
                              ...newCollection,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter collection description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateCollection(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createCollection}>
                        Create Collection
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection) => (
                  <Card
                    key={collection.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCollection?.id === collection.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedCollection(collection)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {collection.name}
                        </CardTitle>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCollection(collection);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCollection(collection.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {collection.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Fields: {collection.fields.length}</span>
                        <Badge variant="outline">
                          {collection.documents_count || 0} documents
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {collections.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No collections found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first collection to start storing data.
                  </p>
                  <Button onClick={() => setShowCreateCollection(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Collection
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {selectedProject && selectedCollection && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Documents in {selectedCollection.name}
                  </h2>
                  <p className="text-gray-600">
                    Manage individual data records
                  </p>
                </div>
                <Dialog
                  open={showCreateDocument}
                  onOpenChange={setShowCreateDocument}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Document</DialogTitle>
                      <DialogDescription>
                        Create a new document in this collection.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="document-data">
                          Document Data (JSON)
                        </Label>
                        <Textarea
                          id="document-data"
                          value={JSON.stringify(newDocument.data, null, 2)}
                          onChange={(e) => {
                            try {
                              setNewDocument({
                                data: JSON.parse(e.target.value),
                              });
                            } catch (err) {
                              // Invalid JSON, keep the text for editing
                            }
                          }}
                          placeholder='{"key": "value"}'
                          rows={6}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDocument(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createDocument}>Create Document</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {documents.map((document) => (
                  <Card key={document.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Document {document.id.slice(0, 8)}...
                        </CardTitle>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // View document details
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(document.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Created:{" "}
                        {new Date(document.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(document.data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No documents found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first document to start storing data.
                  </p>
                  <Button onClick={() => setShowCreateDocument(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

