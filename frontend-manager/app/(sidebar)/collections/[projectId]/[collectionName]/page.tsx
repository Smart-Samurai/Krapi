"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDatabase,
  FiFile,
  FiKey,
  FiHash,
  FiType,
  FiCalendar,
  FiToggleLeft,
  FiList,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Collection, CollectionField } from "@/lib/krapi";

// Field type icons mapping
const fieldTypeIcons: Record<string, React.ReactNode> = {
  string: <FiType className="h-4 w-4" />,
  number: <FiHash className="h-4 w-4" />,
  boolean: <FiToggleLeft className="h-4 w-4" />,
  date: <FiCalendar className="h-4 w-4" />,
  array: <FiList className="h-4 w-4" />,
  object: <FiFile className="h-4 w-4" />,
};

export default function CollectionDetailPage() {
  const router = useRouter();
  const krapi = useKrapi();
  const params = useParams();
  const projectId = params.projectId as string;
  const collectionName = params.collectionName as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Field management state
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<CollectionField | null>(
    null
  );
  const [fieldForm, setFieldForm] = useState({
    name: "",
    type: "string",
    required: false,
    unique: false,
    indexed: false,
    defaultValue: "",
    description: "",
  });

  useEffect(() => {
    if (krapi && projectId && collectionName) {
      fetchCollection();
    }
  }, [krapi, projectId, collectionName]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const response = await krapi.collections.get(projectId, collectionName);
      if (response.success && response.data) {
        setCollection(response.data);
      } else {
        setError("Collection not found");
      }
    } catch (err) {
      console.error("Error fetching collection:", err);
      setError("Failed to fetch collection");
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!collection || !fieldForm.name) return;

    try {
      const newField: CollectionField = {
        name: fieldForm.name,
        type: fieldForm.type as any,
        required: fieldForm.required,
        unique: fieldForm.unique,
        indexed: fieldForm.indexed,
        default: fieldForm.defaultValue || undefined,
        description: fieldForm.description || undefined,
      };

      const updatedFields = [...(collection.fields || []), newField];

      const response = await krapi.collections.update(
        projectId,
        collectionName,
        {
          fields: updatedFields,
        }
      );

      if (response.success && response.data) {
        setCollection(response.data);
        setIsAddFieldOpen(false);
        resetFieldForm();
      } else {
        setError(response.error || "Failed to add field");
      }
    } catch (err) {
      console.error("Error adding field:", err);
      setError("Failed to add field");
    }
  };

  const handleUpdateField = async () => {
    if (!collection || !editingField || !fieldForm.name) return;

    try {
      const updatedFields = collection.fields.map((field) =>
        field.name === editingField.name
          ? {
              name: fieldForm.name,
              type: fieldForm.type as any,
              required: fieldForm.required,
              unique: fieldForm.unique,
              indexed: fieldForm.indexed,
              default: fieldForm.defaultValue || undefined,
              description: fieldForm.description || undefined,
            }
          : field
      );

      const response = await krapi.collections.update(
        projectId,
        collectionName,
        {
          fields: updatedFields,
        }
      );

      if (response.success && response.data) {
        setCollection(response.data);
        setEditingField(null);
        resetFieldForm();
      } else {
        setError(response.error || "Failed to update field");
      }
    } catch (err) {
      console.error("Error updating field:", err);
      setError("Failed to update field");
    }
  };

  const handleDeleteField = async (fieldName: string) => {
    if (
      !collection ||
      !confirm(`Are you sure you want to delete the "${fieldName}" field?`)
    ) {
      return;
    }

    try {
      const updatedFields = collection.fields.filter(
        (field) => field.name !== fieldName
      );

      const response = await krapi.collections.update(
        projectId,
        collectionName,
        {
          fields: updatedFields,
        }
      );

      if (response.success && response.data) {
        setCollection(response.data);
      } else {
        setError(response.error || "Failed to delete field");
      }
    } catch (err) {
      console.error("Error deleting field:", err);
      setError("Failed to delete field");
    }
  };

  const resetFieldForm = () => {
    setFieldForm({
      name: "",
      type: "string",
      required: false,
      unique: false,
      indexed: false,
      defaultValue: "",
      description: "",
    });
  };

  const openEditField = (field: CollectionField) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      type: field.type,
      required: field.required || false,
      unique: field.unique || false,
      indexed: field.indexed || false,
      defaultValue: field.default?.toString() || "",
      description: field.description || "",
    });
  };

  if (!krapi) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-text/60">Initializing...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-text/60">Loading collection...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <FiDatabase className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            Collection not found
          </h3>
          <Button onClick={() => router.push("/collections")}>
            Back to Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">{collection.name}</h1>
        <p className="text-text/60 mt-1">
          {collection.description || "Manage collection fields and structure"}
        </p>
      </div>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => setIsAddFieldOpen(true)}>
          <FiPlus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/collections/${projectId}/${collectionName}/documents`)
          }
        >
          <FiFile className="mr-2 h-4 w-4" />
          View Documents
        </Button>
      </div>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Fields</CardTitle>
        </CardHeader>
        <CardContent>
          {collection.fields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text/60 mb-4">No fields defined yet</p>
              <Button onClick={() => setIsAddFieldOpen(true)} variant="outline">
                <FiPlus className="mr-2 h-4 w-4" />
                Add First Field
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {collection.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-text/60">
                      {fieldTypeIcons[field.type] || (
                        <FiType className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {field.unique && (
                          <Badge variant="outline" className="text-xs">
                            <FiKey className="mr-1 h-3 w-3" />
                            Unique
                          </Badge>
                        )}
                        {field.indexed && (
                          <Badge variant="outline" className="text-xs">
                            Indexed
                          </Badge>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-sm text-text/60 mt-1">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditField(field)}
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteField(field.name)}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Field Dialog */}
      <Dialog
        open={isAddFieldOpen || !!editingField}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddFieldOpen(false);
            setEditingField(null);
            resetFieldForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Field" : "Add Field"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Update the field configuration"
                : "Add a new field to your collection"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                value={fieldForm.name}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, name: e.target.value })
                }
                placeholder="e.g., title, email, age"
              />
            </div>
            <div>
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={fieldForm.type}
                onValueChange={(value) =>
                  setFieldForm({ ...fieldForm, type: value })
                }
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="field-description">Description (optional)</Label>
              <Textarea
                id="field-description"
                value={fieldForm.description}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, description: e.target.value })
                }
                placeholder="Brief description of this field"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="field-default">Default Value (optional)</Label>
              <Input
                id="field-default"
                value={fieldForm.defaultValue}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, defaultValue: e.target.value })
                }
                placeholder="Default value for this field"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-required"
                  checked={fieldForm.required}
                  onCheckedChange={(checked) =>
                    setFieldForm({ ...fieldForm, required: !!checked })
                  }
                />
                <Label htmlFor="field-required" className="cursor-pointer">
                  Required field
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-unique"
                  checked={fieldForm.unique}
                  onCheckedChange={(checked) =>
                    setFieldForm({ ...fieldForm, unique: !!checked })
                  }
                />
                <Label htmlFor="field-unique" className="cursor-pointer">
                  Unique values only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-indexed"
                  checked={fieldForm.indexed}
                  onCheckedChange={(checked) =>
                    setFieldForm({ ...fieldForm, indexed: !!checked })
                  }
                />
                <Label htmlFor="field-indexed" className="cursor-pointer">
                  Create index for faster queries
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddFieldOpen(false);
                setEditingField(null);
                resetFieldForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingField ? handleUpdateField : handleAddField}>
              {editingField ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
