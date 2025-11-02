"use client";

import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Search,
  Filter,
  HardDrive,
  MoreHorizontal,
  Eye,
  Edit,
  Link,
  Copy,
  Code2,
  BookOpen,
  Folder,
  FolderPlus,
  FolderOpen,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
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
import type { FileInfo } from "@/lib/krapi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchFiles,
  fetchStorageStats,
  uploadFile,
  updateFile,
  deleteFile,
} from "@/store/storageSlice";
import { beginBusy, endBusy } from "@/store/uiSlice";
import {
  PageLayout,
  PageHeader,
  ActionButton,
  EmptyState,
} from "@/components/common";

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar")
  )
    return Archive;
  if (mimeType.startsWith("text/") || mimeType.includes("document"))
    return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileTypeCategory = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "Images";
  if (mimeType.startsWith("video/")) return "Videos";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar")
  )
    return "Archives";
  if (mimeType.startsWith("text/") || mimeType.includes("document"))
    return "Documents";
  return "Other";
};

export default function FilesPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const filesBucket = useAppSelector(
    (s) => s.storage.filesByProjectId[projectId]
  );
  const statsBucket = useAppSelector(
    (s) => s.storage.statsByProjectId[projectId]
  );
  const files = filesBucket?.items || [];
  const storageStats = statsBucket?.data || null;
  const isLoading =
    filesBucket?.loading || false || statsBucket?.loading || false;

  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [editingFile, setEditingFile] = useState<FileInfo | null>(null);
  const [editFormData, setEditFormData] = useState({
    original_name: "",
    metadata: {} as Record<string, unknown>,
  });
  const [folders, setFolders] = useState<
    Array<{ id: string; name: string; path: string; parent_id?: string }>
  >([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderFormData, setFolderFormData] = useState({
    name: "",
    parent_id: "",
    description: "",
  });

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [sortBy] = useState("created_at");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const loadFilesCb = useCallback(() => {
    dispatch(fetchFiles({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  const loadStorageStatsCb = useCallback(() => {
    dispatch(fetchStorageStats({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  const loadFolders = useCallback(async () => {
    if (!krapi?.storage) return;
    try {
      const result = await krapi.storage.getAllFolders(projectId);
      if (result.success && result.data) {
        setFolders(result.data as Array<{ id: string; name: string; path: string; parent_id?: string }>);
      }
    } catch {
      // Error logged for debugging
    }
  }, [krapi, projectId]);

  useEffect(() => {
    loadFilesCb();
    loadStorageStatsCb();
    loadFolders();
  }, [loadFilesCb, loadStorageStatsCb, loadFolders]);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      dispatch(beginBusy());
      const action = await dispatch(uploadFile({ projectId, file, krapi }));
      if (uploadFile.fulfilled.match(action)) {
        loadFilesCb();
      } else {
        const msg =
          (action as { payload?: string }).payload || "Failed to upload file";
        setError(String(msg));
      }
    } catch {
      setError("Failed to upload file");
    } finally {
      setIsUploading(false);
      dispatch(endBusy());
    }
  };

  const handleDownload = async (file: FileInfo) => {
    if (!krapi) return;

    try {
      const result = await krapi.storage.downloadFile(projectId, file.id);
      // downloadFile returns a Blob for file downloads
      if (result instanceof Blob) {
        // Create a download link
        const link = document.createElement("a");
        link.href = URL.createObjectURL(result);
        link.download = file.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        const response = result as unknown as { success?: boolean; data?: Blob; error?: string };
        if (response.success && response.data) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(response.data);
          link.download = file.original_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } else {
          setError(response.error || "Failed to download file");
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while downloading file");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      dispatch(beginBusy());
      const action = await dispatch(deleteFile({ projectId, fileId, krapi }));
      if (deleteFile.fulfilled.match(action)) {
        loadFilesCb();
      } else {
        const msg =
          (action as { payload?: string }).payload || "Failed to delete file";
        setError(String(msg));
      }
    } catch {
      setError("Failed to delete file");
    } finally {
      dispatch(endBusy());
    }
  };

  const copyFileUrl = async (file: FileInfo) => {
    try {
      await navigator.clipboard.writeText(file.url);
      // You could add a toast notification here
    } catch {
      // Error logged for debugging
    }
  };

  const openFileDetails = (file: FileInfo) => {
    setSelectedFile(file);
    setIsDetailsDialogOpen(true);
  };

  const openEditFile = (file: FileInfo) => {
    setEditingFile(file);
    setSelectedFolderId(file.folder_id || null);
    setEditFormData({
      original_name: file.original_name,
      metadata: (file.metadata as Record<string, unknown>) || {},
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateFile = async () => {
    if (!editingFile) return;

    try {
      dispatch(beginBusy());
      const action = await dispatch(
        updateFile({
          projectId,
          fileId: editingFile.id,
          updates: {
            original_name: editFormData.original_name,
            metadata: editFormData.metadata,
            folder_id: selectedFolderId || undefined,
          },
          krapi,
        })
      );
      if (updateFile.fulfilled.match(action)) {
        setIsEditDialogOpen(false);
        setEditingFile(null);
        loadFilesCb();
        toast.success("File updated successfully");
      } else {
        const msg =
          (action as { payload?: string }).payload || "Failed to update file";
        setError(String(msg));
      }
    } catch {
      setError("An error occurred while updating file");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleCreateFolder = async () => {
    if (!folderFormData.name || !krapi?.storage) return;

    try {
      dispatch(beginBusy());
      const result = await krapi.storage.createFolder(projectId, {
        name: folderFormData.name,
        parent_id: folderFormData.parent_id || undefined,
        description: folderFormData.description || undefined,
      });
      if (result.success) {
        setIsFolderDialogOpen(false);
        setFolderFormData({ name: "", parent_id: "", description: "" });
        loadFolders();
        toast.success("Folder created successfully");
      } else {
        setError(result.error || "Failed to create folder");
      }
    } catch {
      setError("An error occurred while creating folder");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!krapi?.storage) return;
    if (!confirm("Are you sure you want to delete this folder? Files in this folder will not be deleted.")) {
      return;
    }

    try {
      dispatch(beginBusy());
      const result = await krapi.storage.deleteFolder(projectId, folderId);
      if (result.success) {
        loadFolders();
        toast.success("Folder deleted successfully");
      } else {
        setError(result.error || "Failed to delete folder");
      }
    } catch {
      setError("An error occurred while deleting folder");
    } finally {
      dispatch(endBusy());
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !selectedFolderId || file.folder_id === selectedFolderId;
    const matchesType =
      fileTypeFilter === "all" ||
      getFileTypeCategory(file.mime_type) === fileTypeFilter;
    return matchesSearch && matchesType && matchesFolder;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aValue: string | number, bValue: string | number;

    switch (sortBy) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "size":
        aValue = a.size;
        bValue = b.size;
        break;
      case "name":
        aValue = a.original_name.toLowerCase();
        bValue = b.original_name.toLowerCase();
        break;
      default:
        const aVal = a[sortBy as keyof FileInfo];
        const bVal = b[sortBy as keyof FileInfo];
        aValue =
          typeof aVal === "string" || typeof aVal === "number"
            ? aVal
            : String(aVal);
        bValue =
          typeof bVal === "string" || typeof bVal === "number"
            ? bVal
            : String(bVal);
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={`files-skeleton-${i}`} className="h-32 w-full" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Files"
        description="Manage your project's file storage"
        action={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  for (let i = 0; i < files.length; i++) {
                    handleUpload(files[i]);
                  }
                }
              }}
              className="hidden"
              accept="*/*"
            />
            <ActionButton
              variant="add"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </ActionButton>
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="outline" icon={FolderPlus}>
                  New Folder
                </ActionButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Organize your files into folders
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="folder-name">Folder Name *</Label>
                    <Input
                      id="folder-name"
                      value={folderFormData.name}
                      onChange={(e) =>
                        setFolderFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter folder name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="folder-parent">Parent Folder (Optional)</Label>
                    <Select
                      value={folderFormData.parent_id}
                      onValueChange={(value) =>
                        setFolderFormData((prev) => ({
                          ...prev,
                          parent_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (Root)</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="folder-description">Description (Optional)</Label>
                    <Textarea
                      id="folder-description"
                      value={folderFormData.description}
                      onChange={(e) =>
                        setFolderFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Folder description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <ActionButton
                    variant="outline"
                    onClick={() => setIsFolderDialogOpen(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    variant="add"
                    onClick={handleCreateFolder}
                    disabled={!folderFormData.name}
                  >
                    Create Folder
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
                  File Storage API Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI File Storage API
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

// Get all files in a project
const files = await krapi.storage.getFiles(projectId);

// Get file info
const fileInfo = await krapi.storage.getFileInfo(projectId, fileId);

// Upload a file
const file = new File(['file content'], 'filename.txt', { type: 'text/plain' });
const uploadedFile = await krapi.storage.uploadFile(projectId, file, (progress) => {
  console.log('Upload progress:', progress);
});

// Download a file
const downloadResult = await krapi.storage.downloadFile(projectId, fileId);
if (downloadResult.success) {
  // Handle the blob/buffer data
  const blob = downloadResult.data;
}

// Delete a file
await krapi.storage.deleteFile(projectId, fileId);

// Get storage statistics
const stats = await krapi.storage.getStats(projectId);

// Get file URL
const fileUrl = krapi.storage.getFileUrl(projectId, fileId);`}
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

# Get all files
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/storage/files",
    headers=headers
)
files = response.json()

# Get file info
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/storage/files/{file_id}",
    headers=headers
)
file_info = response.json()

# Upload a file
with open('file.txt', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        f"{BASE_URL}/projects/{PROJECT_ID}/storage/files",
        headers={"Authorization": f"Bearer {API_KEY}"},
        files=files
    )
uploaded_file = response.json()

# Download a file
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/storage/files/{file_id}/download",
    headers=headers
)
with open('downloaded_file.txt', 'wb') as f:
    f.write(response.content)

# Delete a file
response = requests.delete(
    f"{BASE_URL}/projects/{PROJECT_ID}/storage/files/{file_id}",
    headers=headers
)

# Get storage statistics
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/storage/stats",
    headers=headers
)
stats = response.json()`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">
                    File Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <h4 className="font-medium mb-2">
                        Supported Operations:
                      </h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? Upload files with progress tracking</li>
                        <li>? Download files as blob/buffer</li>
                        <li>? Get file metadata and info</li>
                        <li>? Delete files permanently</li>
                        <li>? Get storage usage statistics</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">File Properties:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? filename - Stored filename</li>
                        <li>? original_name - Original filename</li>
                        <li>? mime_type - File type</li>
                        <li>? size - File size in bytes</li>
                        <li>? url - Direct download URL</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Used Space</span>
                <span className="text-base text-muted-foreground">
                  {formatFileSize(storageStats.total_size)} /{" "}
                  {formatFileSize(0)}
                </span>
              </div>
              <Progress
                value={storageStats.storage_used_percentage || 0}
                className="w-full"
              />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-base font-bold">
                    {storageStats.total_files || 0}
                  </div>
                  <div className="text-base text-muted-foreground">Files</div>
                </div>
                <div>
                  <div className="text-base font-bold">
                    {formatFileSize(storageStats.total_size)}
                  </div>
                  <div className="text-base text-muted-foreground">Used</div>
                </div>
                <div>
                  <div className="text-base font-bold">
                    {Math.round(storageStats.storage_used_percentage || 0)}%
                  </div>
                  <div className="text-base text-muted-foreground">Usage</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Files</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fileType">File Type</Label>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Images">Images</SelectItem>
                  <SelectItem value="Videos">Videos</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="Documents">Documents</SelectItem>
                  <SelectItem value="Archives">Archives</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select
                value={selectedFolderId || "all"}
                onValueChange={(value) =>
                  setSelectedFolderId(value === "all" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder.path}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Upload Date</SelectItem>
                  <SelectItem value="size">File Size</SelectItem>
                  <SelectItem value="name">File Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isUploading && (
        <Alert>
          <AlertDescription>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 animate-pulse" />
              Uploading files... {Math.round(uploadProgress)}%
            </div>
            <Progress value={uploadProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {sortedFiles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Files Yet"
          description="Upload your first file to get started"
          action={{
            label: "Upload Files",
            onClick: () => fileInputRef.current?.click(),
            icon: Upload,
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files ({sortedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mime_type);
                    return (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium truncate">
                                {file.original_name}
                              </p>
                              <p className="text-base text-muted-foreground truncate">
                                {file.filename}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getFileTypeCategory(file.mime_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-base">
                            {formatFileSize(file.size)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-base text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()}
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
                                onClick={() => openFileDetails(file)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditFile(file)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownload(file)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyFileUrl(file)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected file
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const FileIcon = getFileIcon(selectedFile.mime_type);
                  return (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  );
                })()}
                <div>
                  <h3 className="font-semibold">
                    {selectedFile.original_name}
                  </h3>
                  <p className="text-base text-muted-foreground">
                    {selectedFile.filename}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>File Type</Label>
                  <p className="text-base">{selectedFile.mime_type}</p>
                </div>
                <div>
                  <Label>File Size</Label>
                  <p className="text-base">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <Label>Upload Date</Label>
                  <p className="text-base">
                    {new Date(selectedFile.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Last Modified</Label>
                  <p className="text-base">
                    {new Date(selectedFile.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <Label>File URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={selectedFile.url} readOnly />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFileUrl(selectedFile)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedFile.relations && selectedFile.relations.length > 0 && (
                <div>
                  <Label>Relations</Label>
                  <div className="space-y-2">
                    {selectedFile.relations.map((relation) => (
                      <div
                        key={`files-relation-${relation.type}-${
                          relation.target_id
                        }-${Date.now()}`}
                        className="flex items-center gap-2 text-base"
                      >
                        <Link className="h-4 w-4" />
                        <span>
                          {relation.type}: {relation.target_type} (
                          {relation.target_id})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailsDialogOpen(false)}
            >
              Close
            </Button>
            {selectedFile && (
              <Button onClick={() => handleDownload(selectedFile)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit File Metadata Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit File Metadata</DialogTitle>
            <DialogDescription>
              Update file name and custom metadata
            </DialogDescription>
          </DialogHeader>
          {editingFile && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-original-name">File Name</Label>
                <Input
                  id="edit-original-name"
                  value={editFormData.original_name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      original_name: e.target.value,
                    }))
                  }
                  placeholder="Enter file name"
                />
              </div>

              <div>
                <Label htmlFor="edit-folder">Folder</Label>
                <Select
                  value={selectedFolderId || ""}
                  onValueChange={(value) =>
                    setSelectedFolderId(value || null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Root)</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Metadata (JSON)</Label>
                <Textarea
                  value={JSON.stringify(editFormData.metadata, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditFormData((prev) => ({
                        ...prev,
                        metadata: parsed,
                      }));
                    } catch {
                      // Invalid JSON - ignore
                    }
                  }}
                  placeholder='{"key": "value"}'
                  className="font-mono text-base"
                  rows={6}
                />
                <p className="text-base text-muted-foreground mt-1">
                  Enter metadata as JSON object
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <ActionButton
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingFile(null);
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="edit"
              onClick={handleUpdateFile}
              disabled={!editFormData.original_name}
            >
              Update File
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Management Section */}
      {folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Folders ({folders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-base text-muted-foreground text-sm">
                        {folder.path}
                      </p>
                    </div>
                  </div>
                  <ActionButton
                    variant="delete"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDeleteFolder(folder.id)}
                  >
                    Delete
                  </ActionButton>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
