/**
 * Documents Page
 * 
 * Page for managing documents within a project collection.
 * Provides document creation, editing, deletion, and filtering.
 * 
 * @module app/(sidebar)/projects/[projectId]/documents/page
 * @example
 * // Automatically rendered at /projects/[projectId]/documents route
 */
/**
 * Documents Page
 * 
 * Page for managing documents within a project collection.
 * Provides document CRUD operations, filtering, and pagination.
 * 
 * @module app/(sidebar)/projects/[projectId]/documents/page
 * @example
 * // Automatically rendered at /projects/[projectId]/documents route
 */
"use client";

import {
  Plus,
  Edit,
  Trash2,
  Database,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Code2,
  BookOpen,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";

import {
  PageLayout,
  PageHeader,
  ActionButton,
  CodeSnippet,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Document, CollectionField } from "@/lib/krapi";
import { fetchCollections } from "@/store/collectionsSlice";
import {
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/store/documentsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { beginBusy, endBusy } from "@/store/uiSlice";

/**
 * Documents Page Component
 * 
 * Displays documents for a selected collection with CRUD operations.
 * 
 * @returns {JSX.Element} Documents page
 */
export default function DocumentsPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const dispatch = useAppDispatch();
  const collectionsBucket = useAppSelector(
    (s) => s.collections.byProjectId[projectId]
  );
  const collections = useMemo(
    () => collectionsBucket?.items || [],
    [collectionsBucket?.items]
  );
  const documents = useAppSelector((s) =>
    selectedCollection
      ? s.documents.byKey[`${projectId}:${selectedCollection}`] || []
      : []
  );
  const documentsLoading = useAppSelector((s) => s.documents.loading);
  const isLoading = collectionsBucket?.loading || false || documentsLoading;
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

  // Form state for creating/editing documents
  const [formData, setFormData] = useState({
    collection_id: "",
    data: {} as Record<string, unknown>,
  });

  const loadCollections = useCallback(() => {
    if (!krapi) return;
    dispatch(fetchCollections({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  const loadDocuments = useCallback(() => {
    if (!selectedCollection || !krapi) return;
    dispatch(
      fetchDocuments({ projectId, collectionId: selectedCollection, krapi })
    );
  }, [dispatch, projectId, selectedCollection, krapi]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (collections.length > 0 && !selectedCollection && collections[0]) {
      setSelectedCollection(collections[0].id);
    }
  }, [collections, selectedCollection]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateDocument = async () => {
    if (!selectedCollection) return;
    if (!krapi) {
      setError("KRAPI client not initialized");
      return;
    }
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        createDocument({
          projectId,
          collectionId: selectedCollection,
          data: formData.data,
          krapi,
        })
      );
      if (createDocument.fulfilled.match(action)) {
        setIsCreateDialogOpen(false);
        setFormData({ collection_id: "", data: {} });
        loadDocuments();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to create document";
        setError(String(msg));
      }
    } catch {
      setError("An error occurred while creating document");
      // Error logged for debugging
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;
    if (!krapi) {
      setError("KRAPI client not initialized");
      return;
    }

    try {
      dispatch(beginBusy());
      const action = await dispatch(
        updateDocument({
          projectId,
          collectionId: selectedCollection,
          id: editingDocument.id,
          data: formData.data,
          krapi,
        })
      );

      if (updateDocument.fulfilled.match(action)) {
        setIsEditDialogOpen(false);
        setEditingDocument(null);
        setFormData({ collection_id: "", data: {} });
        loadDocuments();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update document";
        setError(String(msg));
      }
    } catch {
      setError("An error occurred while updating document");
      // Error logged for debugging
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return;
    }
    if (!krapi) {
      setError("KRAPI client not initialized");
      return;
    }

    try {
      dispatch(beginBusy());
      const action = await dispatch(
        deleteDocument({
          projectId,
          collectionId: selectedCollection,
          id: documentId,
          krapi,
        })
      );
      if (deleteDocument.fulfilled.match(action)) {
        loadDocuments();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to delete document";
        setError(String(msg));
      }
    } catch {
      setError("An error occurred while deleting document");
      // Error logged for debugging
    } finally {
      dispatch(endBusy());
    }
  };

  const openEditDialog = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      collection_id: document.collection_id,
      data: { ...(document.data as Record<string, unknown>) },
    });
    setIsEditDialogOpen(true);
  };

  const getCurrentCollection = () => {
    return collections.find((c) => c.id === selectedCollection);
  };

  const renderFieldValue = (value: unknown, fieldType: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (fieldType) {
      case "date":
        try {
          if (typeof value === "string" || typeof value === "number") {
            return new Date(value).toLocaleDateString();
          }
          return <span className="text-muted-foreground">Invalid date</span>;
        } catch {
          return <span className="text-muted-foreground">Invalid date</span>;
        }
      case "boolean":
        return value ? "Yes" : "No";
      case "number":
        return String(value);
      case "array":
        return Array.isArray(value) ? value.join(", ") : String(value);
      case "object":
        return <pre className="text-base">{JSON.stringify(value, null, 2)}</pre>;
      default:
        return String(value);
    }
  };

  if (isLoading && collections.length === 0) {
    return (
      <PageLayout>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={`documents-skeleton-item-${i}`} className="h-32 w-full" />
          ))}
        </div>
      </PageLayout>
    );
  }

  const currentCollection = getCurrentCollection();

  return (
    <PageLayout>
      <PageHeader
        title="Documents"
        description="Manage documents in your collections"
        action={
          <div className="flex items-center gap-2">
            <CodeSnippet
              context="documents"
              projectId={projectId}
              collectionName={currentCollection?.name}
            />
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <ActionButton
                  variant="add"
                  icon={Plus}
                  disabled={!selectedCollection}
                >
                  Create Document
                </ActionButton>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the {currentCollection?.name} collection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {currentCollection?.fields?.map((field: CollectionField) => (
                  <div key={`create-doc-field-${field.name}`}>
                    <Label htmlFor={field.name}>
                      {field.name}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.name}
                      value={String(formData.data[field.name] || "")}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          data: {
                            ...(prev.data as Record<string, unknown>),
                            [field.name]: e.target.value as string,
                          },
                        }))
                      }
                      placeholder={`Enter ${field.name}`}
                      required={field.required}
                      onBlur={(e) => {
                        // Prevent modal from refocusing when input loses focus
                        e.stopPropagation();
                      }}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <ActionButton
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="add"
                  onClick={handleCreateDocument}
                >
                  Create Document
                </ActionButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="outline" icon={BookOpen}>
                  API Docs
                </ActionButton>
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
                  <h3 className="text-base font-semibold mb-3">TypeScript SDK</h3>
                  <div className="bg-muted p-4 ">
                    <pre className="text-base overflow-x-auto">
                      {`// Initialize KRAPI client (like Appwrite!)
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';

const krapi = new KrapiClient({
  endpoint: 'http://localhost:3470',
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
                  <h3 className="text-base font-semibold mb-3">
                    Python Requests
                  </h3>
                  <div className="bg-muted p-4 ">
                    <pre className="text-base overflow-x-auto">
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
                  <h3 className="text-base font-semibold mb-3">Query Options</h3>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <h4 className="font-medium mb-2">Pagination:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? page - Page number (default: 1)</li>
                        <li>? limit - Items per page (default: 50)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Sorting:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? orderBy - Field to sort by</li>
                        <li>? order - &apos;asc&apos; or &apos;desc&apos;</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Filtering:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? field - Field name</li>
                        <li>? operator - eq, ne, gt, lt, etc.</li>
                        <li>? value - Filter value</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Search:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? search - Text search term</li>
                        <li>? fields - Specific fields to search</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
      />

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
            <h3 className="text-base font-semibold mb-2">
              No Collections Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Create a collection first to start managing documents
            </p>
          </CardContent>
        </Card>
      ) : documentsLoading ? (
        <Card>
          <CardContent className="text-center py-12">
            <Skeleton className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base font-semibold mb-2">Loading Documents...</h3>
            <p className="text-muted-foreground mb-4">
              Please wait while we fetch the documents.
            </p>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base font-semibold mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first document in the {currentCollection?.name}{" "}
              collection
            </p>
            <Button className="btn-add" onClick={() => setIsCreateDialogOpen(true)}>
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
                    {currentCollection?.fields?.map((field: CollectionField) => (
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
                      <TableCell className="font-mono text-base">
                        {document.id.substring(0, 8)}...
                      </TableCell>
                      {currentCollection?.fields?.map((field: CollectionField) => (
                        <TableCell key={field.name}>
                          {renderFieldValue(
                            document.data[field.name],
                            field.type
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="text-base text-muted-foreground">
                          {new Date(document.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-base text-muted-foreground">
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
            {currentCollection?.fields?.map((field: CollectionField) => (
              <div key={`edit-doc-field-${field.name}`}>
                <Label htmlFor={`edit-${field.name}`}>
                  {field.name}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Input
                  id={`edit-${field.name}`}
                  value={String(formData.data[field.name] || "")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      data: {
                        ...(prev.data as Record<
                          string,
                          string | number | boolean
                        >),
                        [field.name]: e.target.value as string,
                      },
                    }))
                  }
                  placeholder={`Enter ${field.name}`}
                  required={field.required}
                  onBlur={(e) => {
                    // Prevent modal from refocusing when input loses focus
                    e.stopPropagation();
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <ActionButton
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="edit"
              onClick={handleUpdateDocument}
            >
              Update Document
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
