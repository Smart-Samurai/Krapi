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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFile,
  FiEye,
  FiCopy,
} from "react-icons/fi";
import { useKrapi } from "@/contexts/krapi-context";
import type { TableSchema, Document } from "@/lib/krapi";

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { krapi } = useKrapi();
  const projectId = params.projectId as string;
  const tableName = params.tableName as string;

  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Document management state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentForm, setDocumentForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (krapi && projectId && tableName) {
      fetchData();
    }
  }, [krapi, projectId, tableName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch schema first
      const schemaResponse = await krapi.database.getSchema(projectId, tableName);
      if (schemaResponse.success) {
        setSchema(schemaResponse.data);
        
        // Initialize form with default values
        const defaultForm: Record<string, any> = {};
        schemaResponse.data.fields.forEach((field) => {
          if (field.default !== undefined) {
            defaultForm[field.name] = field.default;
          } else if (field.type === "boolean") {
            defaultForm[field.name] = false;
          } else if (field.type === "number") {
            defaultForm[field.name] = 0;
          } else if (field.type === "array") {
            defaultForm[field.name] = [];
          } else if (field.type === "object") {
            defaultForm[field.name] = {};
          } else {
            defaultForm[field.name] = "";
          }
        });
        setDocumentForm(defaultForm);
      }
      
      // Fetch documents
      const docsResponse = await krapi.database.getDocuments(projectId, tableName);
      if (docsResponse.success) {
        setDocuments(docsResponse.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const response = await krapi.database.createDocument(
        projectId,
        tableName,
        documentForm
      );
      
      if (response.success) {
        setIsCreateOpen(false);
        fetchData();
        resetForm();
      } else {
        setError(response.error || "Failed to create document");
      }
    } catch (err) {
      console.error("Error creating document:", err);
      setError("Failed to create document");
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      const response = await krapi.database.updateDocument(
        projectId,
        tableName,
        selectedDocument.id,
        documentForm
      );
      
      if (response.success) {
        setIsEditOpen(false);
        fetchData();
        resetForm();
      } else {
        setError(response.error || "Failed to update document");
      }
    } catch (err) {
      console.error("Error updating document:", err);
      setError("Failed to update document");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const response = await krapi.database.deleteDocument(
        projectId,
        tableName,
        documentId
      );
      
      if (response.success) {
        fetchData();
      } else {
        setError(response.error || "Failed to delete document");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document");
    }
  };

  const resetForm = () => {
    if (schema) {
      const defaultForm: Record<string, any> = {};
      schema.fields.forEach((field) => {
        if (field.default !== undefined) {
          defaultForm[field.name] = field.default;
        } else if (field.type === "boolean") {
          defaultForm[field.name] = false;
        } else if (field.type === "number") {
          defaultForm[field.name] = 0;
        } else if (field.type === "array") {
          defaultForm[field.name] = [];
        } else if (field.type === "object") {
          defaultForm[field.name] = {};
        } else {
          defaultForm[field.name] = "";
        }
      });
      setDocumentForm(defaultForm);
    }
    setSelectedDocument(null);
  };

  const openEditDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setDocumentForm(doc.data);
    setIsEditOpen(true);
  };

  const openViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setIsViewOpen(true);
  };

  const copyDocumentId = (id: string) => {
    navigator.clipboard.writeText(id);
    // You could show a toast notification here
  };

  const renderFieldInput = (field: any) => {
    const value = documentForm[field.name];
    
    switch (field.type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.name}
              checked={value || false}
              onChange={(e) =>
                setDocumentForm({
                  ...documentForm,
                  [field.name]: e.target.checked,
                })
              }
              className="h-4 w-4"
            />
            <Label htmlFor={field.name} className="cursor-pointer">
              {field.description || "Check to enable"}
            </Label>
          </div>
        );
      
      case "number":
        return (
          <Input
            type="number"
            value={value || 0}
            onChange={(e) =>
              setDocumentForm({
                ...documentForm,
                [field.name]: parseFloat(e.target.value) || 0,
              })
            }
          />
        );
      
      case "date":
        return (
          <Input
            type="datetime-local"
            value={value || ""}
            onChange={(e) =>
              setDocumentForm({
                ...documentForm,
                [field.name]: e.target.value,
              })
            }
          />
        );
      
      case "array":
      case "object":
        return (
          <Textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setDocumentForm({
                  ...documentForm,
                  [field.name]: parsed,
                });
              } catch {
                // Invalid JSON, don't update
              }
            }}
            rows={4}
            placeholder={`Enter valid JSON for ${field.type}`}
          />
        );
      
      default: // string
        return (
          <Input
            type="text"
            value={value || ""}
            onChange={(e) =>
              setDocumentForm({
                ...documentForm,
                [field.name]: e.target.value,
              })
            }
          />
        );
    }
  };

  if (!krapi || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-text/60">Loading...</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <FiFile className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">Schema not found</h3>
          <Button onClick={() => router.push("/database")}>
            Back to Database
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">{schema.name} Documents</h1>
        <p className="text-text/60 mt-1">
          Manage documents in the {schema.name} collection
        </p>
      </div>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => setIsCreateOpen(true)}>
          <FiPlus className="mr-2 h-4 w-4" />
          Create Document
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/database/${projectId}/${tableName}`)}
        >
          Back to Schema
        </Button>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text/60 mb-4">No documents yet</p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                <FiPlus className="mr-2 h-4 w-4" />
                Create First Document
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  {schema.fields.slice(0, 3).map((field) => (
                    <TableHead key={field.name}>{field.name}</TableHead>
                  ))}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{doc.id.slice(0, 8)}...</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyDocumentId(doc.id)}
                        >
                          <FiCopy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    {schema.fields.slice(0, 3).map((field) => (
                      <TableCell key={field.name}>
                        {typeof doc.data[field.name] === "object"
                          ? JSON.stringify(doc.data[field.name])
                          : String(doc.data[field.name] || "-")}
                      </TableCell>
                    ))}
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDocument(doc)}
                        >
                          <FiEye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDocument(doc)}
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Document Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditOpen ? "Edit Document" : "Create Document"}
            </DialogTitle>
            <DialogDescription>
              {isEditOpen
                ? "Update the document data"
                : "Create a new document in this collection"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {schema.fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.name}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {field.description && (
                  <p className="text-sm text-text/60 mb-1">{field.description}</p>
                )}
                {renderFieldInput(field)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={isEditOpen ? handleUpdateDocument : handleCreateDocument}>
              {isEditOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              ID: {selectedDocument?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Metadata</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-text/60">Created:</span>{" "}
                    {new Date(selectedDocument.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-text/60">Updated:</span>{" "}
                    {new Date(selectedDocument.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Data</h4>
                <pre className="bg-accent/50 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(selectedDocument.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}