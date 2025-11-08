/**
 * Collections Page
 * 
 * Page for managing collections within a project.
 * Provides collection creation, editing, deletion, and field management.
 * 
 * @module app/(sidebar)/projects/[projectId]/collections/page
 * @example
 * // Automatically rendered at /projects/[projectId]/collections route
 */
/**
 * Collections Page
 * 
 * Page for managing collections within a project.
 * Provides collection creation, editing, deletion, and field management.
 * 
 * @module app/(sidebar)/projects/[projectId]/collections/page
 * @example
 * // Automatically rendered at /projects/[projectId]/collections route
 */
"use client";

import {
  Plus,
  Edit,
  Trash2,
  Database,
  FileText,
  Calendar,
  Hash,
  Code,
  Type,
  Code2,
  BookOpen,
  Link as LinkIcon,
  ArrowRight,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import {
  PageLayout,
  PageHeader,
  ActionButton,
  EmptyState,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { FieldType, type Collection, type CollectionField } from "@/lib/krapi";
import {
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from "@/store/collectionsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { beginBusy, endBusy } from "@/store/uiSlice";

// FieldType is now imported from the SDK

/**
 * Field Type Icons Mapping
 * 
 * Maps field types to icon components for UI display.
 * 
 * @constant {Partial<Record<FieldType, React.ComponentType>>}
 */
// Common field type icons - only include the most commonly used types for UI
const fieldTypeIcons: Partial<
  Record<FieldType, React.ComponentType<{ className?: string }>>
> = {
  [FieldType.string]: Type,
  [FieldType.text]: FileText,
  [FieldType.number]: Hash,
  [FieldType.integer]: Hash,
  [FieldType.float]: Hash,
  [FieldType.boolean]: Type,
  [FieldType.date]: Calendar,
  [FieldType.datetime]: Calendar,
  [FieldType.time]: Calendar,
  [FieldType.array]: Code,
  [FieldType.object]: Code,
  [FieldType.uniqueID]: Hash,
  [FieldType.uuid]: Hash,
  [FieldType.relation]: LinkIcon,
  [FieldType.json]: Code,
  [FieldType.email]: Type,
  [FieldType.url]: LinkIcon,
  [FieldType.phone]: Type,
  [FieldType.password]: Type,
  [FieldType.file]: FileText,
  [FieldType.image]: FileText,
  [FieldType.video]: FileText,
  [FieldType.audio]: FileText,
};

/**
 * Field Type Labels Mapping
 * 
 * Maps field types to human-readable labels.
 * 
 * @constant {Record<FieldType, string>}
 */
/**
 * Collections Page Component
 * 
 * Manages collections for a project with full CRUD operations.
 * 
 * @returns {JSX.Element} Collections management page
 */
export default function CollectionsPage() {
  const params = useParams();
  const router = useRouter();
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
  const isLoading = collectionsBucket?.loading || false;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCollections = useCallback(() => {
    dispatch(fetchCollections({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreate = async (data: { name: string; description?: string; fields: CollectionField[] }) => {
    if (!krapi) return;

    setIsCreating(true);
    try {
      dispatch(beginBusy());
      await dispatch(createCollection({ projectId, collection: data, krapi })).unwrap();
      toast.success("Collection created successfully");
      setIsCreateDialogOpen(false);
      loadCollections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create collection");
    } finally {
      setIsCreating(false);
      dispatch(endBusy());
    }
  };

  const handleEdit = async (data: { description?: string; fields?: CollectionField[] }) => {
    if (!krapi || !selectedCollection) return;

    setIsUpdating(true);
    try {
      dispatch(beginBusy());
      await dispatch(updateCollection({ projectId, collectionName: selectedCollection.name, updates: data, krapi })).unwrap();
      toast.success("Collection updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCollection(null);
      loadCollections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update collection");
    } finally {
      setIsUpdating(false);
      dispatch(endBusy());
    }
  };

  const handleDelete = async (collectionName: string) => {
    if (!krapi) return;

    if (!confirm(`Are you sure you want to delete collection "${collectionName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      dispatch(beginBusy());
      await dispatch(deleteCollection({ projectId, collectionName, krapi })).unwrap();
      toast.success("Collection deleted successfully");
      loadCollections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
    } finally {
      setIsDeleting(false);
      dispatch(endBusy());
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Collections"
        description="Manage your project collections and schemas"
        action={
          <ActionButton variant="add" icon={Plus} onClick={() => setIsCreateDialogOpen(true)}>
            Create Collection
          </ActionButton>
        }
      />

      {isLoading ? (
        <LoadingState count={3} />
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No collections"
          description="Create your first collection to start managing data"
          action={{
            label: "Create Collection",
            onClick: () => setIsCreateDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{collection.name}</CardTitle>
                    {collection.description && (
                      <CardDescription>{collection.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      variant="edit"
                      icon={Edit}
                      onClick={() => {
                        setSelectedCollection(collection);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      variant="delete"
                      icon={Trash2}
                      onClick={() => handleDelete(collection.name)}
                      disabled={isDeleting}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Fields:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {collection.fields?.map((field) => {
                      const Icon = fieldTypeIcons[field.type] || Type;
                      return (
                        <div key={field.name} className="flex items-center gap-2 p-2 border rounded">
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{field.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {fieldTypeLabels[field.type]}
                              {field.required && " • Required"}
                              {field.unique && " • Unique"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <FormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create Collection"
        description="Create a new collection with custom fields"
        submitLabel="Create"
        onSubmit={() => {}}
        isSubmitting={isCreating}
      >
        {/* Form content would go here */}
      </FormDialog>

      {/* Edit Dialog */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Edit Collection"
        description="Update collection fields and settings"
        submitLabel="Update"
        onSubmit={() => {}}
        isSubmitting={isUpdating}
      >
        {/* Form content would go here */}
      </FormDialog>
    </PageLayout>
  );
}

/**
 * Field Type Labels Mapping
 * 
 * Maps field types to human-readable labels.
 * 
 * @constant {Record<FieldType, string>}
 */
// Field type labels for display
const fieldTypeLabels: Record<FieldType, string> = {
  [FieldType.string]: "String",
  [FieldType.text]: "Text (Long)",
  [FieldType.number]: "Number",
  [FieldType.integer]: "Integer",
  [FieldType.float]: "Float",
  [FieldType.boolean]: "Boolean",
  [FieldType.date]: "Date",
  [FieldType.datetime]: "Date & Time",
  [FieldType.time]: "Time",
  [FieldType.timestamp]: "Timestamp",
  [FieldType.email]: "Email",
  [FieldType.url]: "URL",
  [FieldType.phone]: "Phone",
  [FieldType.uuid]: "UUID",
  [FieldType.uniqueID]: "Unique ID",
  [FieldType.json]: "JSON",
  [FieldType.array]: "Array",
  [FieldType.object]: "Object",
  [FieldType.file]: "File",
  [FieldType.image]: "Image",
  [FieldType.video]: "Video",
  [FieldType.audio]: "Audio",
  [FieldType.reference]: "Reference",
  [FieldType.relation]: "Relation",
  [FieldType.enum]: "Enum",
  [FieldType.password]: "Password",
  [FieldType.encrypted]: "Encrypted",
  [FieldType.varchar]: "Varchar",
  [FieldType.decimal]: "Decimal",
};

export default function CollectionsPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const router = useRouter();
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const dispatch = useAppDispatch();
  const collectionsBucket = useAppSelector(
    (s) => s.collections.byProjectId[projectId]
  );
  const collections = collectionsBucket?.items || [];
  const isLoading = collectionsBucket?.loading || false;
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );

  // Form state for creating/editing collections
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fields: [] as Array<CollectionField & { _tempId?: string }>,
  });

  const loadCollections = useCallback(() => {
    dispatch(fetchCollections({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreateCollection = async () => {
    try {
      // Validate fields before submitting
      const validFields = formData.fields.filter((field) => {
        // Remove empty fields and fields without valid names
        if (!field.name || field.name.trim() === "") {
          return false;
        }
        // Validate field name format (must start with letter/underscore, contain only alphanumeric/underscore)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name.trim())) {
          toast.error(
            `Invalid field name: "${field.name}". Field names must start with a letter or underscore and contain only letters, numbers, and underscores.`
          );
          return false;
        }
        return true;
      });

      if (validFields.length === 0) {
        toast.error("Please add at least one field with a valid name");
        return;
      }

      // Validate collection name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name.trim())) {
        toast.error(
          "Collection name must start with a letter and contain only letters, numbers, and underscores."
        );
        return;
      }

      dispatch(beginBusy());
      
      // Clean up fields: remove _tempId and ensure all required properties are present
      const cleanedFields: CollectionField[] = validFields.map((field) => {
        const { _tempId, ...cleanField } = field;
        
        // Ensure type is set (should always be FieldType enum)
        if (!cleanField.type) {
          console.error("⚠️ [COLLECTIONS DEBUG] Field missing type:", cleanField);
          throw new Error(`Field "${cleanField.name}" is missing a type`);
        }
        
        return {
          name: cleanField.name.trim(),
          type: cleanField.type, // Keep as FieldType enum (serializes to string automatically)
          required: cleanField.required ?? false,
          unique: cleanField.unique ?? false,
          indexed: cleanField.indexed ?? false,
        };
      });

      console.log("🔍 [COLLECTIONS DEBUG] Creating collection with data:", {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        fields: cleanedFields,
      });

      const action = await dispatch(
        createCollection({
          projectId,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            fields: cleanedFields,
          },
          krapi,
        })
      );
      if (createCollection.fulfilled.match(action)) {
        setIsCreateDialogOpen(false);
        setFormData({ name: "", description: "", fields: [] });
        loadCollections();
        toast.success("Collection created successfully");
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to create collection";
        console.error("❌ [COLLECTIONS DEBUG] Create collection failed:", msg);
        setError(String(msg));
        toast.error(`Failed to create collection: ${msg}`);
      }
    } catch (error) {
      // Error logged for debugging
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Failed to create collection: ${errorMessage}`);
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        updateCollection({
          projectId,
          collectionId: editingCollection.id,
          updates: {
            description: formData.description,
            fields: formData.fields,
          },
          krapi,
        })
      );
      if (updateCollection.fulfilled.match(action)) {
        setIsEditDialogOpen(false);
        setEditingCollection(null);
        setFormData({ name: "", description: "", fields: [] });
        loadCollections();
        toast.success("Collection updated successfully");
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update collection";
        setError(String(msg));
      }
    } catch {
      // Error logged for debugging
      setError("Failed to update collection");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this collection? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      dispatch(beginBusy());
      const action = await dispatch(
        deleteCollection({ projectId, collectionId, krapi })
      );
      if (deleteCollection.fulfilled.match(action)) {
        loadCollections();
        toast.success("Collection deleted successfully");
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to delete collection";
        setError(String(msg));
      }
    } catch {
      // Error logged for debugging
      setError("Failed to delete collection");
    } finally {
      dispatch(endBusy());
    }
  };

  const addField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          name: "",
          type: FieldType.string,
          required: false,
          unique: false,
          indexed: false,
          _tempId: `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
      ],
    }));
  };

  const removeField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const updateField = (index: number, field: Partial<CollectionField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }));
  };

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection);
    // Add temp IDs to existing fields to prevent remounting issues
    const fieldsWithIds = (collection.fields || []).map((field) => ({
      ...field,
      _tempId: `edit-field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    }));
    setFormData({
      name: collection.name,
      description: collection.description || "",
      fields: fieldsWithIds,
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={`collections-skeleton-${i}`} className="h-32 w-full" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Collections"
        description="Manage your project's data collections and their fields"
        action={
          <div className="flex items-center gap-2">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <ActionButton variant="add" icon={Plus}>
                  Create Collection
                </ActionButton>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
                <DialogDescription>
                  Define a new collection with its fields and properties
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Collection Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., users, posts, products"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what this collection is for"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Fields</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addField}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.fields.map((field, _index) => {
                      const _Icon = fieldTypeIcons[field.type] || Type;
                      // Use stable key based on temp ID or index to prevent remounting on name change
                      const fieldKey = field._tempId || `field-${_index}`;
                      return (
                        <div
                          key={fieldKey}
                          className="flex items-center gap-2 p-3 border "
                        >
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Field name"
                              value={field.name}
                              onChange={(e) =>
                                updateField(_index, { name: e.target.value })
                              }
                              onBlur={(e) => {
                                // Prevent modal from refocusing when input loses focus
                                e.stopPropagation();
                              }}
                            />
                            <Select
                              value={field.type}
                              onValueChange={(value: FieldType) =>
                                updateField(_index, { type: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(fieldTypeLabels).map(
                                  ([value, label]) => {
                                    const Icon =
                                      fieldTypeIcons[value as FieldType] ||
                                      Type;
                                    return (
                                      <SelectItem key={value} value={value}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          {label}
                                        </div>
                                      </SelectItem>
                                    );
                                  }
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant={field.required ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                updateField(_index, {
                                  required: !field.required,
                                })
                              }
                              className={
                                field.required
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "hover:bg-muted"
                              }
                            >
                              Required
                            </Button>
                            <Button
                              type="button"
                              variant={field.unique ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                updateField(_index, { unique: !field.unique })
                              }
                              className={
                                field.unique
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "hover:bg-muted"
                              }
                            >
                              Unique
                            </Button>
                            <Button
                              type="button"
                              variant={field.indexed ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                updateField(_index, { indexed: !field.indexed })
                              }
                              className={
                                field.indexed
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "hover:bg-muted"
                              }
                            >
                              Indexed
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeField(_index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                  onClick={handleCreateCollection}
                  disabled={!formData.name}
                >
                  Create Collection
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
                  Collections API Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI Collections API
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-3">TypeScript SDK</h3>
                  <div className="bg-muted p-4 ">
                    <pre className="text-base overflow-x-auto">
                      {`// Initialize KRAPI client (like Appwrite!)
import { KrapiClient } from '@krapi/sdk/client';

const krapi = new KrapiClient({
  endpoint: 'http://localhost:3470',
  apiKey: 'your-api-key'
});

// Get all collections
const collections = await krapi.collections.getAll(projectId);

// Create a new collection
const newCollection = await krapi.collections.create(projectId, {
  name: 'users',
  description: 'User accounts',
  fields: [
    {
      name: 'email',
      type: 'string',
      required: true,
      unique: true
    },
    {
      name: 'age',
      type: 'number',
      required: false
    },
    {
      name: 'isActive',
      type: 'boolean',
      default: true
    }
  ]
});

// Update a collection
const updated = await krapi.collections.update(projectId, collectionId, {
  name: 'updated-name',
  fields: [...]
});

// Delete a collection
await krapi.collections.delete(projectId, collectionId);`}
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
PROJECT_ID = "your-project-id"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get all collections
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/collections",
    headers=headers
)
collections = response.json()

# Create a new collection
collection_data = {
    "name": "users",
    "description": "User accounts",
    "fields": [
        {
            "name": "email",
            "type": "string",
            "required": True,
            "unique": True
        },
        {
            "name": "age",
            "type": "number",
            "required": False
        }
    ]
}

response = requests.post(
    f"{BASE_URL}/projects/{PROJECT_ID}/collections",
    headers=headers,
    json=collection_data
)
new_collection = response.json()

# Update a collection
update_data = {
    "name": "updated-name",
    "fields": [...]
}

response = requests.put(
    f"{BASE_URL}/projects/{PROJECT_ID}/collections/{collection_id}",
    headers=headers,
    json=update_data
)

# Delete a collection
response = requests.delete(
    f"{BASE_URL}/projects/{PROJECT_ID}/collections/{collection_id}",
    headers=headers
)`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">
                    Available Field Types
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <h4 className="font-medium mb-2">Basic Types:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? string - Text data</li>
                        <li>? text - Long text data</li>
                        <li>? number - Numeric values</li>
                        <li>? boolean - True/false values</li>
                        <li>? date - Date and time</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Advanced Types:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? array - Array of values</li>
                        <li>? object - JSON objects</li>
                        <li>? uniqueID - Unique identifiers</li>
                        <li>? relation - References to other collections</li>
                        <li>? json - Flexible JSON data</li>
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {collections.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No Collections Yet"
          description="Create your first collection to start storing data"
          action={{
            label: "Create Collection",
            onClick: () => setIsCreateDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Database className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle 
                          className="cursor-pointer hover:text-primary transition-colors flex-1 min-w-0 truncate"
                          onClick={() =>
                            router.push(
                              `/projects/${projectId}/collections/${collection.name}/documents`
                            )
                          }
                          title="Click to view documents"
                        >
                          {collection.name}
                        </CardTitle>
                        <span onClick={(e) => e.stopPropagation()}>
                          <ActionButton
                            variant="outline"
                            size="sm"
                            icon={Edit}
                            onClick={() => openEditDialog(collection)}
                          >
                            Edit
                          </ActionButton>
                        </span>
                      </div>
                      {collection.description && (
                        <CardDescription className="mt-1">
                          {collection.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline">
                      {collection.fields?.length || 0} fields
                    </Badge>
                    <ActionButton
                      variant="default"
                      size="sm"
                      icon={ArrowRight}
                      onClick={() =>
                        router.push(
                          `/projects/${projectId}/collections/${collection.name}/documents`
                        )
                      }
                    >
                      View
                    </ActionButton>
                    <ActionButton
                      variant="delete"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Properties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collection.fields?.map((field: CollectionField, _index: number) => {
                      const Icon = fieldTypeIcons[field.type] || Type;
                      return (
                        <TableRow
                          key={`collections-table-field-${
                            field.name
                          }-${Date.now()}`}
                        >
                          <TableCell className="font-medium">
                            {field.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {fieldTypeLabels[field.type]}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {field.required && (
                                <Badge variant="secondary">Required</Badge>
                              )}
                              {field.unique && (
                                <Badge variant="secondary">Unique</Badge>
                              )}
                              {field.indexed && (
                                <Badge variant="secondary">Indexed</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Modify the collection fields and properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Collection Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., users, posts, products"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe what this collection is for"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addField}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
              <div className="space-y-3">
                {formData.fields.map((field, _index) => {
                  const _Icon = fieldTypeIcons[field.type] || Type;
                  // Use stable key based on temp ID or index to prevent remounting on name change
                  const fieldKey = field._tempId || `edit-field-${_index}`;
                  return (
                    <div
                      key={fieldKey}
                      className="flex items-center gap-2 p-3 border "
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) =>
                            updateField(_index, { name: e.target.value })
                          }
                          onBlur={(e) => {
                            // Prevent modal from refocusing when input loses focus
                            e.stopPropagation();
                          }}
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value: FieldType) =>
                            updateField(_index, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(fieldTypeLabels).map(
                              ([value, label]) => {
                                const Icon =
                                  fieldTypeIcons[value as FieldType] || Type;
                                return (
                                  <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      {label}
                                    </div>
                                  </SelectItem>
                                );
                              }
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant={field.required ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            updateField(_index, { required: !field.required })
                          }
                          className={
                            field.required
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-muted"
                          }
                        >
                          Required
                        </Button>
                        <Button
                          type="button"
                          variant={field.unique ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            updateField(_index, { unique: !field.unique })
                          }
                          className={
                            field.unique
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-muted"
                          }
                        >
                          Unique
                        </Button>
                        <Button
                          type="button"
                          variant={field.indexed ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            updateField(_index, { indexed: !field.indexed })
                          }
                          className={
                            field.indexed
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-muted"
                          }
                        >
                          Indexed
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeField(_index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
              onClick={handleUpdateCollection}
              disabled={!formData.name}
            >
              Update Collection
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
