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
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

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
    fields: [] as CollectionField[],
  });

  const loadCollections = useCallback(() => {
    dispatch(fetchCollections({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreateCollection = async () => {
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        createCollection({
          projectId,
          data: {
            name: formData.name,
            description: formData.description,
            fields: formData.fields,
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
        setError(String(msg));
      }
    } catch {
      // Error logged for debugging
      setError("Failed to create collection");
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
    setFormData({
      name: collection.name,
      description: collection.description || "",
      fields: collection.fields || [],
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={`collections-skeleton-item-${i}`}
              className="h-32 w-full"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground">
            Manage your project&apos;s data collections and their fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
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
                      return (
                        <div
                          key={`collections-field-${_index}-${
                            field.name || "unnamed"
                          }`}
                          className="flex items-center gap-2 p-3 border rounded-lg"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Field name"
                              value={field.name}
                              onChange={(e) =>
                                updateField(_index, { name: e.target.value })
                              }
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
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateField(_index, {
                                  required: !field.required,
                                })
                              }
                              className={
                                field.required
                                  ? "bg-primary text-primary-foreground"
                                  : ""
                              }
                            >
                              Required
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateField(_index, { unique: !field.unique })
                              }
                              className={
                                field.unique
                                  ? "bg-primary text-primary-foreground"
                                  : ""
                              }
                            >
                              Unique
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateField(_index, { indexed: !field.indexed })
                              }
                              className={
                                field.indexed
                                  ? "bg-primary text-primary-foreground"
                                  : ""
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
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCollection}
                  disabled={!formData.name}
                >
                  Create Collection
                </Button>
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
                  Collections API Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI Collections API
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">TypeScript SDK</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
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
                  <h3 className="text-lg font-semibold mb-3">
                    Available Field Types
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {collections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first collection to start storing data
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {collection.name}
                    </CardTitle>
                    {collection.description && (
                      <CardDescription>
                        {collection.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {collection.fields?.length || 0} fields
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(collection)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/projects/${projectId}/collections/${collection.name}/documents`
                        )
                      }
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                    {collection.fields?.map((field, _index) => {
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
                  return (
                    <div
                      key={`collections-edit-field-${
                        field.name || "unnamed"
                      }-${Date.now()}`}
                      className="flex items-center gap-2 p-3 border rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) =>
                            updateField(_index, { name: e.target.value })
                          }
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
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateField(_index, { required: !field.required })
                          }
                          className={
                            field.required
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          Required
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateField(_index, { unique: !field.unique })
                          }
                          className={
                            field.unique
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          Unique
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateField(_index, { indexed: !field.indexed })
                          }
                          className={
                            field.indexed
                              ? "bg-primary text-primary-foreground"
                              : ""
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
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCollection} disabled={!formData.name}>
              Update Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
