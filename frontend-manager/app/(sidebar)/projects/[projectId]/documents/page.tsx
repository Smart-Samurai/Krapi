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
/* eslint-disable import/order, @typescript-eslint/no-unused-vars */
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
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useReduxAuth } from "@/contexts/redux-auth-context";
import type { Document, CollectionField } from "@/lib/krapi";
import {
  convertDocumentData,
  validateDocumentData,
  type ValidationError,
} from "@/lib/document-utils";
import { DocumentFieldInput } from "@/components/documents/DocumentFieldInput";
import { fetchCollections } from "@/store/collectionsSlice";
import {
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
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
  const searchParams = useSearchParams();
  // Get projectId with fallback - all hooks must be called unconditionally
  const projectId = (params && params.projectId ? String(params.projectId) : null) || "";
  const dispatch = useAppDispatch();
  const { sessionToken } = useReduxAuth();
  const collectionsBucket = useAppSelector(
    (s) => s.collections.byProjectId[projectId]
  );
  const collections = useMemo(
    () => collectionsBucket?.items || [],
    [collectionsBucket?.items]
  );
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  // Get the collection name from the selected collection ID for Redux store lookup
  // Redux store uses collectionName as the key, not collection ID
  const selectedCollectionObj = useMemo(
    () => collections.find((c) => c.id === selectedCollection),
    [collections, selectedCollection]
  );
  const collectionNameForStore = selectedCollectionObj?.name || "";
  // Get documents from Redux store using collection name as key
  // Redux store uses collectionName (not ID) as the key
  const documents = useAppSelector((s) => {
    if (!collectionNameForStore) return [];
    const key = `${projectId}:${collectionNameForStore}`;
    return s.documents.byKey[key] || [];
  });
  const documentsLoading = useAppSelector((s) => s.documents.loading);
  const isLoading = collectionsBucket?.loading || false || documentsLoading;
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bulk operations state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);

  // Aggregation state
  const [isAggregationDialogOpen, setIsAggregationDialogOpen] = useState(false);
  const [aggregationGroupBy, setAggregationGroupBy] = useState<string[]>([]);
  const [aggregationType, setAggregationType] = useState<"count" | "sum" | "avg" | "min" | "max">("count");
  const [aggregationField, setAggregationField] = useState<string>("");
  const [aggregationResults, setAggregationResults] = useState<unknown[]>([]);
  const [isAggregating, setIsAggregating] = useState(false);

  // Form state for creating/editing documents
  const [formData, setFormData] = useState({
    collection_id: "",
    data: {} as Record<string, unknown>,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadCollections = useCallback(() => {
    dispatch(fetchCollections({ projectId }));
  }, [dispatch, projectId]);

  const loadDocuments = useCallback(() => {
    if (!selectedCollection) return;
    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) return;
    dispatch(
      fetchDocuments({ projectId, collectionName: currentCollection.name })
    );
  }, [dispatch, projectId, selectedCollection, collections]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Read collection name from URL query params (for when coming from /collections/[collectionName]/documents route)
  useEffect(() => {
    const collectionNameFromUrl = searchParams.get("collection");
    if (collectionNameFromUrl && collections.length > 0) {
      // Find collection by name
      const collection = collections.find((c) => c.name === collectionNameFromUrl);
      if (collection && collection.id !== selectedCollection) {
        setSelectedCollection(collection.id);
      }
    }
  }, [collections, selectedCollection, searchParams]);

  useEffect(() => {
    if (collections.length > 0 && !selectedCollection && collections[0]) {
      setSelectedCollection(collections[0].id);
    }
  }, [collections, selectedCollection]);

  // Load documents when collection is selected
  useEffect(() => {
    if (selectedCollection && collections.length > 0 && !searchQuery.trim()) {
      loadDocuments();
    }
  }, [selectedCollection, collections.length, loadDocuments, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      // If search is empty, load all documents
      loadDocuments();
    }
  }, [loadDocuments, searchQuery]);

  // Debounced search effect
  useEffect(() => {
    if (!selectedCollection || !sessionToken) return;
    
    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) return;

    // If search query is empty, don't search
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        await dispatch(
          searchDocuments({
            projectId,
            collectionName: currentCollection.name,
            query: searchQuery.trim(),
            sessionToken,
          })
        ).unwrap();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Search error:", error);
        setError(error instanceof Error ? error.message : "Search failed");
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, selectedCollection, projectId, collections, sessionToken, dispatch]);

  // Early return after all hooks are called
  if (!projectId || projectId === "") {
    return (
      <PageLayout>
        <Alert variant="destructive">
          <AlertDescription>Project ID is required</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  const handleCreateDocument = async () => {
    if (!selectedCollection) return;
    try {
      dispatch(beginBusy());
      setFieldErrors({});
      setError(null);
      
      const currentCollection = collections.find((c) => c.id === selectedCollection);
      if (!currentCollection) {
        setError("Collection not found");
        return;
      }

      // Validate document data
      const validationErrors = validateDocumentData(
        formData.data,
        selectedCollectionObj?.fields || []
      );

      if (validationErrors.length > 0) {
        const errors: Record<string, string> = {};
        validationErrors.forEach((err) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        setError("Please fix the validation errors");
        dispatch(endBusy());
        return;
      }

      // Convert field values to appropriate types
      const convertedData = convertDocumentData(
        formData.data,
        selectedCollectionObj?.fields || []
      );

      if (!selectedCollectionObj) {
        setError("Collection not found");
        dispatch(endBusy());
        return;
      }

      const action = await dispatch(
        createDocument({
          projectId,
          collectionName: selectedCollectionObj.name,
          data: convertedData,
        })
      );
      if (createDocument.fulfilled.match(action)) {
        setIsCreateDialogOpen(false);
        setFormData({ collection_id: "", data: {} });
        setFieldErrors({});
        setError(null);
        toast.success("Document created successfully");
        // Redux store already adds the document immediately via createDocument.fulfilled reducer
        // The document should appear in the table immediately
        // Reload from server to ensure consistency and get any server-side computed fields
        // Use a small delay to ensure Redux state update is processed first
        setTimeout(() => {
          loadDocuments();
        }, 300);
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to create document";
        setError(String(msg));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating document");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;
    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) {
      setError("Collection not found");
      return;
    }

    try {
      dispatch(beginBusy());
      setFieldErrors({});
      setError(null);

      // Validate document data
      const validationErrors = validateDocumentData(
        formData.data,
        currentCollection.fields || []
      );

      if (validationErrors.length > 0) {
        const errors: Record<string, string> = {};
        validationErrors.forEach((err) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        setError("Please fix the validation errors");
        return;
      }

      // Convert field values to appropriate types
      const convertedData = convertDocumentData(
        formData.data,
        currentCollection.fields || []
      );

      const action = await dispatch(
        updateDocument({
          projectId,
          collectionName: currentCollection.name,
          id: editingDocument.id,
          data: convertedData,
        })
      );

      if (updateDocument.fulfilled.match(action)) {
        setIsEditDialogOpen(false);
        setEditingDocument(null);
        setFormData({ collection_id: "", data: {} });
        setFieldErrors({});
        setError(null);
        toast.success("Document updated successfully");
        loadDocuments();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update document";
        setError(String(msg));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while updating document");
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
    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) {
      setError("Collection not found");
      return;
    }

    try {
      dispatch(beginBusy());
      const action = await dispatch(
        deleteDocument({
          projectId,
          collectionName: currentCollection.name,
          id: documentId,
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
    setFieldErrors({});
    setError(null);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (document: Document) => {
    setViewingDocument(document);
    setIsViewDialogOpen(true);
  };

  const getCurrentCollection = () => {
    return collections.find((c) => c.id === selectedCollection);
  };

  // Bulk operations handlers
  const handleSelectDocument = (documentId: string, checked: boolean) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map((d) => d.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0 || !selectedCollection) return;

    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) {
      setError("Collection not found");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDocuments.size} document(s)?`)) {
      return;
    }

    setIsBulkOperationInProgress(true);
    try {
      dispatch(beginBusy());
      const deletePromises = Array.from(selectedDocuments).map((id) =>
        dispatch(
          deleteDocument({
            projectId,
            collectionName: currentCollection.name,
            id,
          })
        )
      );

      await Promise.all(deletePromises);
      setSelectedDocuments(new Set());
      loadDocuments();
      toast.success(`Successfully deleted ${selectedDocuments.size} document(s)`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Bulk delete failed");
      toast.error("Failed to delete some documents");
    } finally {
      dispatch(endBusy());
      setIsBulkOperationInProgress(false);
    }
  };

  const _handleBulkUpdate = async (_updateData: Record<string, unknown>) => {
    if (selectedDocuments.size === 0 || !selectedCollection) return;

    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) {
      setError("Collection not found");
      return;
    }

    setIsBulkOperationInProgress(true);
    try {
      dispatch(beginBusy());
      const updatePromises = Array.from(selectedDocuments).map((id) =>
        dispatch(
          updateDocument({
            projectId,
            collectionName: currentCollection.name,
            id,
            data: _updateData,
          })
        )
      );

      await Promise.all(updatePromises);
      setSelectedDocuments(new Set());
      loadDocuments();
      toast.success(`Successfully updated ${selectedDocuments.size} document(s)`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Bulk update failed");
      toast.error("Failed to update some documents");
    } finally {
      dispatch(endBusy());
      setIsBulkOperationInProgress(false);
    }
  };

  const handleAggregate = async () => {
    if (!selectedCollection || !sessionToken) return;
    const currentCollection = collections.find((c) => c.id === selectedCollection);
    if (!currentCollection) return;

    setIsAggregating(true);
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/collections/${currentCollection.name}/documents/aggregate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            group_by: aggregationGroupBy,
            aggregations: aggregationType === "count" 
              ? []
              : [{
                  [aggregationType]: {
                    type: aggregationType,
                    field: aggregationField,
                  },
                }],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Aggregation failed" }));
        throw new Error(error.error || "Aggregation failed");
      }

      const result = await response.json();
      if (result.success && result.groups) {
        setAggregationResults(Array.isArray(result.groups) ? result.groups : []);
        toast.success(`Aggregation completed: ${result.total_groups || 0} groups`);
      } else {
        throw new Error("Invalid aggregation response");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Aggregation failed");
      toast.error("Failed to aggregate documents");
    } finally {
      setIsAggregating(false);
    }
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

  // Show loading skeleton while collections or documents are loading
  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader
          title="Documents"
          description="Manage documents in your collections"
          showBackButton
          backButtonFallback={`/projects/${projectId}/collections`}
          action={<Skeleton className="h-10 w-32" />}
        />
        {collections.length === 0 ? (
          // Loading collections
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" /> {/* Collection selector skeleton */}
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={`documents-skeleton-row-${i}`} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : (
          // Collections loaded, loading documents
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" /> {/* Collection selector skeleton */}
            <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
              <div className="border rounded-lg">
                <div className="border-b p-4">
                  <Skeleton className="h-4 w-full" />
                </div>
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={`documents-skeleton-row-${i}`} className="border-b p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
          ))}
        </div>
            </div>
          </div>
        )}
      </PageLayout>
    );
  }

  const currentCollection = getCurrentCollection();

  return (
    <PageLayout>
      <PageHeader
        title="Documents"
        description="Manage documents in your collections"
        showBackButton
        backButtonFallback={`/projects/${projectId}/collections`}
        action={
          <div className="flex items-center gap-2">
            <CodeSnippet
              context="documents"
              projectId={projectId}
              collectionName={currentCollection?.name}
            />
            <Button
              variant="outline"
              onClick={() => setIsAggregationDialogOpen(true)}
              disabled={!selectedCollection}
              data-testid="document-aggregate-button"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Aggregate
            </Button>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <ActionButton
                  variant="add"
                  icon={Plus}
                  disabled={!selectedCollection}
                  data-testid="create-document-button"
                  onClick={() => {
                    setFormData({ collection_id: "", data: {} });
                    setFieldErrors({});
                    setError(null);
                  }}
                >
                  Create Document
                </ActionButton>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="create-document-dialog">
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the {selectedCollectionObj?.name} collection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedCollectionObj?.fields?.map((field: CollectionField) => (
                  <div key={`create-doc-field-${field.name}`}>
                    <Label htmlFor={field.name}>
                      {field.name}
                      {field.required ? <span className="text-destructive ml-1">*</span> : null}
                    </Label>
                    <DocumentFieldInput
                      field={field}
                      value={formData.data[field.name]}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          data: {
                            ...(prev.data as Record<string, unknown>),
                            [field.name]: value,
                          },
                        }))
                      }
                      error={fieldErrors[field.name]}
                      placeholder={`Enter ${field.name}`}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <ActionButton
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="create-document-dialog-cancel"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="add"
                  onClick={handleCreateDocument}
                  data-testid="create-document-dialog-submit"
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
                      {`// Connect to KRAPI as a 3rd party application
import { krapi } from '@smartsamurai/krapi-sdk';

// Connect to FRONTEND URL (port 3498), not backend!
await krapi.connect({
  endpoint: 'https://your-krapi-instance.com', // Frontend URL
  apiKey: 'your-api-key'
});

// Get all documents in a collection
const documents = await krapi.documents.getAll(projectId, collectionName, {
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
const newDocument = await krapi.documents.create(projectId, collectionName, {
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    age: 30,
    isActive: true,
    tags: ['customer', 'premium']
  }
});

// Get a specific document
const document = await krapi.documents.get(projectId, collectionName, documentId);

// Update a document
const updated = await krapi.documents.update(projectId, collectionName, documentId, {
  data: {
    name: 'Jane Doe',
    age: 31
  }
});

// Delete a document
await krapi.documents.delete(projectId, collectionName, documentId);

// Search documents
const searchResults = await krapi.documents.search(projectId, collectionName, {
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

# Connect to KRAPI FRONTEND URL (port 3498), not backend!
BASE_URL = "https://your-krapi-instance.com"  # Frontend URL
API_KEY = "your-api-key"
PROJECT_ID = "your-project-id"
COLLECTION_NAME = "your-collection-name"

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
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents",
    headers=headers,
    params=params
)
documents = response.json()

# Create a new document
document_data = {
    "data": {
        "email": "user@example.com",
        "name": "John Doe",
        "age": 30,
        "isActive": True,
        "tags": ["customer", "premium"]
    }
}

response = requests.post(
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents",
    headers=headers,
    json=document_data
)
new_document = response.json()

# Get a specific document
response = requests.get(
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents/{document_id}",
    headers=headers
)
document = response.json()

# Update a document
update_data = {
    "data": {
        "name": "Jane Doe",
        "age": 31
    }
}

response = requests.put(
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents/{document_id}",
    headers=headers,
    json=update_data
)

# Delete a document
response = requests.delete(
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents/{document_id}",
    headers=headers
)

# Search documents
search_data = {
    "query": "john",
    "fields": ["name", "email"]
}

response = requests.post(
    f"{BASE_URL}/api/krapi/k1/projects/{PROJECT_ID}/collections/{COLLECTION_NAME}/documents/search",
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
                <SelectTrigger data-testid="collection-select-trigger">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id} data-testid={`collection-select-item-${collection.id}`}>
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
                  data-testid="document-search-input"
                  className="pl-10"
                />
                {isSearching ? <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div> : null}
              </div>
              {searchQuery.trim() && (
                <p className="text-base text-muted-foreground mt-1">
                  Searching for &quot;{searchQuery}&quot;
                </p>
              )}
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

      {error ? <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert> : null}

      {!selectedCollection ? (
        <Card data-testid="documents-no-collection-state">
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
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table data-testid="documents-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    {currentCollection?.fields?.slice(0, 3).map((field: CollectionField) => (
                      <TableHead key={field.name}><Skeleton className="h-4 w-24" /></TableHead>
                    ))}
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`doc-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {currentCollection?.fields?.slice(0, 3).map((field: CollectionField) => (
                        <TableCell key={field.name}><Skeleton className="h-4 w-32" /></TableCell>
                      ))}
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card data-testid="documents-empty-state">
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
            <div className="flex items-center justify-between">
              <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {currentCollection?.name} Documents
            </CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? "s" : ""} in
              this collection
                  {selectedDocuments.size > 0 && (
                    <span className="ml-2 text-primary">
                      ({selectedDocuments.size} selected)
                    </span>
                  )}
            </CardDescription>
              </div>
              {selectedDocuments.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isBulkOperationInProgress}
                      data-testid="bulk-actions-button"
                    >
                      Bulk Actions ({selectedDocuments.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk Operations</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="text-destructive"
                      data-testid="bulk-delete-button"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        toast.info("Bulk update dialog coming soon");
                      }}
                      data-testid="bulk-update-button"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Update Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table data-testid="documents-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          documents.length > 0 &&
                          selectedDocuments.size === documents.length
                        }
                        onCheckedChange={handleSelectAll}
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
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
                  {(isSearching || isBulkOperationInProgress) ? (
                    <TableRow>
                      <TableCell colSpan={100} className="text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span className="text-muted-foreground">
                            {isSearching ? "Searching..." : "Processing bulk operation..."}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : documents && Array.isArray(documents) && documents.length > 0 ? (
                    documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDocuments.has(document.id)}
                            onCheckedChange={(checked) =>
                              handleSelectDocument(document.id, checked === true)
                            }
                            data-testid={`select-document-${document.id}`}
                          />
                        </TableCell>
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
                              <DropdownMenuItem
                                onClick={() => openViewDialog(document)}
                              >
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={100} className="text-center py-8 text-muted-foreground">
                        No documents found. Create your first document to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aggregation Dialog */}
      <Dialog open={isAggregationDialogOpen} onOpenChange={setIsAggregationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aggregate Documents</DialogTitle>
            <DialogDescription>
              Group and aggregate documents in the {currentCollection?.name} collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-by">Group By Fields</Label>
              <Select
                value={aggregationGroupBy[0] || ""}
                onValueChange={(value) => setAggregationGroupBy([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field to group by" />
                </SelectTrigger>
                <SelectContent>
                  {currentCollection?.fields?.map((field: CollectionField) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.name} ({field.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-base text-muted-foreground mt-1">
                Select a field to group documents by
              </p>
            </div>

            <div>
              <Label htmlFor="aggregation-type">Aggregation Type</Label>
              <Select
                value={aggregationType}
                onValueChange={(value) =>
                  setAggregationType(value as "count" | "sum" | "avg" | "min" | "max")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aggregationType !== "count" && (
              <div>
                <Label htmlFor="aggregation-field">Aggregation Field</Label>
                <Select
                  value={aggregationField}
                  onValueChange={setAggregationField}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field to aggregate" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCollection?.fields
                      ?.filter((field: CollectionField) => field.type === "number")
                      .map((field: CollectionField) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-base text-muted-foreground mt-1">
                  Select a numeric field to aggregate
                </p>
              </div>
            )}

            <Button
              onClick={handleAggregate}
              disabled={isAggregating || !aggregationGroupBy.length || (aggregationType !== "count" && !aggregationField)}
              data-testid="run-aggregation-button"
            >
              {isAggregating ? "Aggregating..." : "Run Aggregation"}
            </Button>

            {aggregationResults.length > 0 && (
              <div>
                <Label>Results</Label>
                <div className="overflow-x-auto mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Count</TableHead>
                        {aggregationType !== "count" && (
                          <TableHead>{aggregationType.toUpperCase()}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregationResults.map((result: unknown) => {
                        const r = result as { _id?: unknown; count?: number; [key: string]: unknown };
                        const resultKey = typeof r._id === "string" ? r._id : typeof r._id === "object" && r._id !== null ? JSON.stringify(r._id) : `result-${Date.now()}-${Math.random()}`;
                        return (
                          <TableRow key={resultKey}>
                            <TableCell>
                              {typeof r._id === "object" && r._id !== null
                                ? JSON.stringify(r._id)
                                : String(r._id || "-")}
                            </TableCell>
                            <TableCell>{r.count || 0}</TableCell>
                            {aggregationType !== "count" && (
                              <TableCell>
                                {r[aggregationType] !== undefined
                                  ? String(r[aggregationType])
                                  : "-"}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAggregationDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              View complete document information from the {currentCollection?.name} collection
            </DialogDescription>
          </DialogHeader>
          {viewingDocument ? <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Document ID</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-base">
                  {viewingDocument.id}
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Collection ID</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-base">
                  {viewingDocument.collection_id}
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Document Data</Label>
                <div className="mt-1 p-4 bg-muted rounded-md">
                  <pre className="text-base whitespace-pre-wrap break-words">
                    {JSON.stringify(viewingDocument.data, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold">Created At</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md text-base">
                    {new Date(viewingDocument.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label className="text-base font-semibold">Updated At</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md text-base">
                    {new Date(viewingDocument.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div> : null}
          <DialogFooter>
            <ActionButton
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </ActionButton>
            {viewingDocument ? <ActionButton
                variant="edit"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  openEditDialog(viewingDocument);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Document
              </ActionButton> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {field.required ? <span className="text-destructive ml-1">*</span> : null}
                </Label>
                <DocumentFieldInput
                  field={field}
                  value={formData.data[field.name]}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      data: {
                        ...(prev.data as Record<string, unknown>),
                        [field.name]: value,
                      },
                    }))
                  }
                  error={fieldErrors[field.name]}
                  placeholder={`Enter ${field.name}`}
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
