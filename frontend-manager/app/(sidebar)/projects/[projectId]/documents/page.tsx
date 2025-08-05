"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type {
  Document,
  Collection,
  QueryOptions,
  FilterCondition,
} from "@/lib/krapi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Database,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  MoreHorizontal,
  Eye,
  Code2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>("");

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Form state for creating/editing documents
  const [formData, setFormData] = useState({
    collection_id: "",
    data: {} as Record<string, any>,
  });

  useEffect(() => {
    if (krapi) {
      loadCollections();
    }
  }, [krapi, projectId]);

  useEffect(() => {
    if (krapi && collections.length > 0) {
      loadDocuments();
    }
  }, [
    krapi,
    collections,
    selectedCollection,
    searchQuery,
    sortBy,
    sortOrder,
    filters,
  ]);

  const loadCollections = async () => {
    if (!krapi) return;

    try {
      const result = await krapi.collections.getAll(projectId);
      if (result.success && result.data) {
        setCollections(result.data);
        if (result.data.length > 0 && !selectedCollection) {
          setSelectedCollection(result.data[0].id);
        }
      } else {
        setError(result.error || "Failed to load collections");
      }
    } catch (err) {
      setError("An error occurred while loading collections");
      console.error("Error loading collections:", err);
    }
  };

  const loadDocuments = async () => {
    if (!krapi || !selectedCollection) return;

    setIsLoading(true);
    setError(null);

    try {
      const options: QueryOptions = {
        page: 1,
        limit: 100,
        orderBy: sortBy,
        order: sortOrder,
        search: searchQuery || undefined,
        filter: filters.length > 0 ? filters : undefined,
      };

      const result = await krapi.documents.getAll(selectedCollection, options);
      if (result.success && result.data) {
        setDocuments(result.data);
      } else {
        setError(result.error || "Failed to load documents");
      }
    } catch (err) {
      setError("An error occurred while loading documents");
      console.error("Error loading documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!krapi || !selectedCollection) return;

    try {
      const result = await krapi.documents.create(
        selectedCollection,
        formData.data
      );
      if (result.success) {
        setIsCreateDialogOpen(false);
        setFormData({ collection_id: "", data: {} });
        loadDocuments();
      } else {
        setError(result.error || "Failed to create document");
      }
    } catch (err) {
      setError("An error occurred while creating document");
      console.error("Error creating document:", err);
    }
  };

  const handleUpdateDocument = async () => {
    if (!krapi || !editingDocument) return;

    try {
      const result = await krapi.documents.update(
        selectedCollection,
        editingDocument.id,
        formData.data
      );

      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingDocument(null);
        setFormData({ collection_id: "", data: {} });
        loadDocuments();
      } else {
        setError(result.error || "Failed to update document");
      }
    } catch (err) {
      setError("An error occurred while updating document");
      console.error("Error updating document:", err);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!krapi) return;

    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const result = await krapi.documents.delete(
        selectedCollection,
        documentId
      );
      if (result.success) {
        loadDocuments();
      } else {
        setError(result.error || "Failed to delete document");
      }
    } catch (err) {
      setError("An error occurred while deleting document");
      console.error("Error deleting document:", err);
    }
  };

  const openEditDialog = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      collection_id: document.collection_id,
      data: { ...document.data },
    });
    setIsEditDialogOpen(true);
  };

  const getCurrentCollection = () => {
    return collections.find((c) => c.id === selectedCollection);
  };

  const renderFieldValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (fieldType) {
      case "boolean":
        return (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "True" : "False"}
          </Badge>
        );
      case "date":
        return <span>{new Date(value).toLocaleDateString()}</span>;
      case "array":
        return (
          <span>
            {Array.isArray(value) ? `${value.length} items` : "Invalid array"}
          </span>
        );
      case "object":
        return (
          <span>{typeof value === "object" ? "Object" : String(value)}</span>
        );
      case "json":
        return (
          <span>
            {typeof value === "object"
              ? JSON.stringify(value).substring(0, 50) + "..."
              : String(value)}
          </span>
        );
      default:
        return <span>{String(value)}</span>;
    }
  };

  if (isLoading && collections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const currentCollection = getCurrentCollection();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage documents in your collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={!selectedCollection}>
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the {currentCollection?.name} collection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {currentCollection?.fields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>
                      {field.name}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.name}
                      value={formData.data[field.name] || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          data: { ...prev.data, [field.name]: e.target.value },
                        }))
                      }
                      placeholder={`Enter ${field.name}`}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateDocument}>Create Document</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                API Docs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Documents API Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI Documents API
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">TypeScript SDK</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`// Initialize KRAPI client
import { KrapiSDK } from '@krapi/sdk';

const krapi = new KrapiSDK({
  baseURL: 'http://localhost:3470',
  apiKey: 'your-api-key'
});

// Get all documents in a collection
const documents = await krapi.documents.getAll(collectionId, {
  page: 1,
  limit: 50,
  orderBy: 'created_at',
  order: 'desc',
  search: 'search term',
  filter: [
    { field: 'status', operator: 'eq', value: 'active' }
  ]
});

// Create a new document
const newDocument = await krapi.documents.create(collectionId, {
  email: 'user@example.com',
  name: 'John Doe',
  age: 30,
  isActive: true,
  tags: ['customer', 'premium']
});

// Get a specific document
const document = await krapi.documents.get(collectionId, documentId);

// Update a document
const updated = await krapi.documents.update(collectionId, documentId, {
  name: 'Jane Doe',
  age: 31
});

// Delete a document
await krapi.documents.delete(collectionId, documentId);

// Search documents
const searchResults = await krapi.documents.search(collectionId, {
  query: 'john',
  fields: ['name', 'email']
});`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Python Requests
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`import requests
import json

# Base configuration
BASE_URL = "http://localhost:3470"
API_KEY = "your-api-key"
COLLECTION_ID = "your-collection-id"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get all documents
params = {
    "page": 1,
    "limit": 50,
    "orderBy": "created_at",
    "order": "desc",
    "search": "search term"
}

response = requests.get(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents",
    headers=headers,
    params=params
)
documents = response.json()

# Create a new document
document_data = {
    "email": "user@example.com",
    "name": "John Doe",
    "age": 30,
    "isActive": True,
    "tags": ["customer", "premium"]
}

response = requests.post(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents",
    headers=headers,
    json=document_data
)
new_document = response.json()

# Get a specific document
response = requests.get(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents/{document_id}",
    headers=headers
)
document = response.json()

# Update a document
update_data = {
    "name": "Jane Doe",
    "age": 31
}

response = requests.put(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents/{document_id}",
    headers=headers,
    json=update_data
)

# Delete a document
response = requests.delete(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents/{document_id}",
    headers=headers
)

# Search documents
search_data = {
    "query": "john",
    "fields": ["name", "email"]
}

response = requests.post(
    f"{BASE_URL}/collections/{COLLECTION_ID}/documents/search",
    headers=headers,
    json=search_data
)
search_results = response.json()`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Query Options</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Pagination:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• page - Page number (default: 1)</li>
                        <li>• limit - Items per page (default: 50)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Sorting:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• orderBy - Field to sort by</li>
                        <li>• order - 'asc' or 'desc'</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Filtering:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• field - Field name</li>
                        <li>• operator - eq, ne, gt, lt, etc.</li>
                        <li>• value - Filter value</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Search:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• search - Text search term</li>
                        <li>• fields - Specific fields to search</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="collection">Collection</Label>
              <Select
                value={selectedCollection}
                onValueChange={setSelectedCollection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="updated_at">Updated Date</SelectItem>
                  <SelectItem value="id">ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedCollection ? (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Collections Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Create a collection first to start managing documents
            </p>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first document in the {currentCollection?.name}{" "}
              collection
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {currentCollection?.name} Documents
            </CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? "s" : ""} in
              this collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    {currentCollection?.fields.map((field) => (
                      <TableHead key={field.name}>{field.name}</TableHead>
                    ))}
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-mono text-sm">
                        {document.id.substring(0, 8)}...
                      </TableCell>
                      {currentCollection?.fields.map((field) => (
                        <TableCell key={field.name}>
                          {renderFieldValue(
                            document.data[field.name],
                            field.type
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(document.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(document.updated_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(document)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteDocument(document.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Modify document data in the {currentCollection?.name} collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentCollection?.fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={`edit-${field.name}`}>
                  {field.name}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Input
                  id={`edit-${field.name}`}
                  value={formData.data[field.name] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      data: { ...prev.data, [field.name]: e.target.value },
                    }))
                  }
                  placeholder={`Enter ${field.name}`}
                  required={field.required}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument}>Update Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
