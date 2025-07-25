"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  Trash2,
  Search,
  Globe,
  Lock,
  Shield,
  File,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileMetadata {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
  access_level: "public" | "private" | "restricted";
  description?: string;
}

interface _FileUploadInput {
  file: File;
  description: string;
  access_level: "public" | "private" | "restricted";
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Upload form state
  const [uploadForm, setUploadForm] = useState<{
    file: File | null;
    description: string;
    access_level: "public" | "private" | "restricted";
  }>({
    file: null,
    description: "",
    access_level: "public",
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    description: string;
    access_level: "public" | "private" | "restricted";
  }>({
    description: "",
    access_level: "public",
  });

  const { handleError, showSuccess } = useNotification();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      // Note: File management is not fully implemented in the new API yet
      // This is placeholder data for demonstration
      setFiles([
        {
          id: 1,
          name: "sample-document.pdf",
          original_name: "sample-document.pdf",
          mime_type: "application/pdf",
          size: 1024 * 1024, // 1MB
          path: "/uploads/sample-document.pdf",
          uploaded_by: "admin",
          permissions: ["read", "write"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          access_level: "public",
          description: "Sample PDF document",
        },
        {
          id: 2,
          name: "image.jpg",
          original_name: "image.jpg",
          mime_type: "image/jpeg",
          size: 512 * 1024, // 512KB
          path: "/uploads/image.jpg",
          uploaded_by: "admin",
          permissions: ["read"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          access_level: "private",
          description: "Sample image file",
        },
      ]);
    } catch (err) {
      handleError(err, "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file) {
      handleError("Please select a file to upload");
      return;
    }

    try {
      // Note: File upload is not fully implemented in the new API yet
      const newFile: FileMetadata = {
        id: Date.now(),
        name: uploadForm.file.name,
        original_name: uploadForm.file.name,
        mime_type: uploadForm.file.type,
        size: uploadForm.file.size,
        path: `/uploads/${uploadForm.file.name}`,
        uploaded_by: "admin",
        permissions: ["read", "write"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        access_level: uploadForm.access_level,
        description: uploadForm.description,
      };

      setFiles([...files, newFile]);
      setShowUploadModal(false);
      setUploadForm({
        file: null,
        description: "",
        access_level: "public",
      });
      showSuccess(`File '${uploadForm.file.name}' uploaded successfully`);
    } catch (err) {
      handleError(err, "Failed to upload file");
    }
  };

  const handleEditFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    try {
      // Note: File editing is not fully implemented in the new API yet
      setFiles(
        files.map((file) =>
          file.id === editingFile.id
            ? { ...file, ...editForm, updated_at: new Date().toISOString() }
            : file
        )
      );
      setEditingFile(null);
      setEditForm({
        description: "",
        access_level: "public",
      });
      showSuccess(`File '${editingFile.name}' updated successfully`);
    } catch (err) {
      handleError(err, "Failed to update file");
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      // Note: File deletion is not fully implemented in the new API yet
      setFiles(files.filter((file) => file.id !== id));
      showSuccess("File deleted successfully");
    } catch (err) {
      handleError(err, "Failed to delete file");
    }
  };

  const handleDownloadFile = async (id: number, filename: string) => {
    try {
      // Note: File download is not fully implemented in the new API yet
      showSuccess(`Download started for '${filename}'`);
    } catch (err) {
      handleError(err, "Failed to download file");
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      case "restricted":
        return <Shield className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case "public":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "private":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "restricted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (mimetype.startsWith("text/")) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.access_level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <NotificationContainer />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">File Management</h1>
          <p className="text-muted-foreground">
            Upload, manage, and organize your files
          </p>
        </div>
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New File</DialogTitle>
              <DialogDescription>
                Select a file to upload to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter file description"
                />
              </div>
              <div>
                <Label htmlFor="access_level">Access Level</Label>
                <Select
                  value={uploadForm.access_level}
                  onValueChange={(value: "public" | "private" | "restricted") =>
                    setUploadForm({ ...uploadForm, access_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Upload File</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading files...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No files found
          </div>
        ) : (
          filteredFiles.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.mime_type)}
                      <div>
                        <h3 className="font-medium">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.mime_type}
                        </p>
                        {file.description && (
                          <p className="text-sm text-muted-foreground">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getAccessLevelBadge(file.access_level)}>
                      {getAccessLevelIcon(file.access_level)}
                      <span className="ml-1">{file.access_level}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFile(file.id, file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingFile(file);
                        setEditForm({
                          description: file.description || "",
                          access_level: file.access_level,
                        });
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit File Modal */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
            <DialogDescription>
              Update file information and access level.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFile} className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Enter file description"
              />
            </div>
            <div>
              <Label htmlFor="edit-access-level">Access Level</Label>
              <Select
                value={editForm.access_level}
                onValueChange={(value: "public" | "private" | "restricted") =>
                  setEditForm({ ...editForm, access_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingFile(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Update File</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
