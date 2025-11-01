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
  Link,
  Copy,
  Code2,
  BookOpen,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

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
  deleteFile,
} from "@/store/storageSlice";
import { beginBusy, endBusy } from "@/store/uiSlice";

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
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

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

  useEffect(() => {
    loadFilesCb();
    loadStorageStatsCb();
  }, [loadFilesCb, loadStorageStatsCb]);

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

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      fileTypeFilter === "all" ||
      getFileTypeCategory(file.mime_type) === fileTypeFilter;
    return matchesSearch && matchesType;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={`files-skeleton-${i}-${Date.now()}`}
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
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">
            Manage your project&apos;s file storage
          </p>
        </div>
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
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
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
                  File Storage API Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI File Storage API
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
                  <h3 className="text-lg font-semibold mb-3">
                    File Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
      </div>

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
                <span className="text-sm font-medium">Used Space</span>
                <span className="text-sm text-muted-foreground">
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
                  <div className="text-2xl font-bold">
                    {storageStats.total_files || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Files</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatFileSize(storageStats.total_size)}
                  </div>
                  <div className="text-sm text-muted-foreground">Used</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(storageStats.storage_used_percentage || 0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Usage</div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Files Yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first file to get started
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
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
                              <p className="text-sm font-medium truncate">
                                {file.original_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
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
                          <span className="text-sm">
                            {formatFileSize(file.size)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.filename}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>File Type</Label>
                  <p className="text-sm">{selectedFile.mime_type}</p>
                </div>
                <div>
                  <Label>File Size</Label>
                  <p className="text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <Label>Upload Date</Label>
                  <p className="text-sm">
                    {new Date(selectedFile.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Last Modified</Label>
                  <p className="text-sm">
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
                        className="flex items-center gap-2 text-sm"
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
    </div>
  );
}
