"use client";

import {
  Upload,
  Download,
  Search,
  File,
  Trash2,
  Eye,
  Copy,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileCode,
  Database,
  HardDrive,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FileItem {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  project_id?: string;
  uploaded_by?: string;
  uploaded_at: string;
  last_accessed?: string;
  download_count: number;
  metadata?: Record<string, unknown>;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

const FILE_TYPE_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  "image/": Image,
  "video/": Video,
  "audio/": Music,
  "text/": FileText,
  "application/pdf": FileText,
  "application/zip": Archive,
  "application/x-rar": Archive,
  "application/json": FileCode,
  "application/javascript": FileCode,
  "application/typescript": FileCode,
  "text/html": FileCode,
  "text/css": FileCode,
  "text/javascript": FileCode,
};

export default function StoragePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const url = selectedProject
        ? `/api/krapi/k1/storage/project/${selectedProject}`
        : "/api/krapi/k1/storage/files";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [selectedProject]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/krapi/k1/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const uploadFile = async (file: File, projectId?: string) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (projectId) {
        formData.append("project_id", projectId);
      }

      const response = await fetch("/api/krapi/k1/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload file");

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await response.json();
      setUploadProgress(100);
      clearInterval(interval);

      await fetchFiles();
      setShowUploadDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`/api/krapi/k1/storage/${fileId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete file");
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/krapi/k1/storage/download/${file.id}`);
      if (!response.ok) throw new Error("Failed to download file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update download count
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const copyFileUrl = async (file: FileItem) => {
    const url = `${window.location.origin}/api/krapi/k1/storage/download/${file.id}`;
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch {
      // Error copying to clipboard - user can manually copy
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100  } ${  sizes[i]}`;
  };

  const getFileIcon = (mimeType: string) => {
    for (const [prefix, Icon] of Object.entries(FILE_TYPE_ICONS)) {
      if (mimeType.startsWith(prefix)) {
        return Icon;
      }
    }
    return File;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "text-green-600";
    if (mimeType.startsWith("video/")) return "text-red-600";
    if (mimeType.startsWith("audio/")) return "text-purple-600";
    if (mimeType.startsWith("text/")) return "text-blue-600";
    if (mimeType.includes("pdf")) return "text-red-600";
    if (mimeType.includes("zip") || mimeType.includes("rar"))
      return "text-orange-600";
    return "text-gray-600";
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFiles(), fetchProjects()]);
      setLoading(false);
    };
    loadData();
  }, [fetchFiles, fetchProjects]);

  const filteredFiles = files.filter(
    (file) =>
      file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">File Storage</h1>
          <p className="text-gray-600">
            Manage file uploads, downloads, and storage
          </p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              return (
                <Card key={file.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileIcon
                          className={`h-5 w-5 ${getFileTypeColor(
                            file.mime_type
                          )}`}
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {file.original_name}
                          </CardTitle>
                          <CardDescription>
                            {formatFileSize(file.size)}
                            {` ? ${file.mime_type}`}
                            {` ? Uploaded: ${formatDate(file.uploaded_at)}`}
                            {file.download_count > 0 &&
                              ` ? Downloaded ${file.download_count} times`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {file.project_id ? "Project" : "Global"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyFileUrl(file)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No files found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No files match your search."
                  : "Upload your first file to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Files
                </CardTitle>
                <File className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{files.length}</div>
                <p className="text-xs text-gray-600">Files in storage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Size
                </CardTitle>
                <HardDrive className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatFileSize(
                    files.reduce((sum, file) => sum + file.size, 0)
                  )}
                </div>
                <p className="text-xs text-gray-600">Storage used</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Downloads
                </CardTitle>
                <Download className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {files.reduce((sum, file) => sum + file.download_count, 0)}
                </div>
                <p className="text-xs text-gray-600">File downloads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <Database className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-gray-600">Active projects</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a file to the storage system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadFile(file, selectedProject || undefined);
                  }
                }}
                disabled={uploading}
              />
            </div>
            <div>
              <Label htmlFor="project-select">Project (Optional)</Label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                   />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
            <DialogDescription>
              Detailed information about this file.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Filename</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile.original_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Size</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">MIME Type</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile.mime_type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Downloads</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile.download_count}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Uploaded</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(selectedFile.uploaded_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Accessed</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedFile.last_accessed
                      ? formatDate(selectedFile.last_accessed)
                      : "Never"}
                  </p>
                </div>
                {selectedFile.project_id && (
                  <div>
                    <Label className="text-sm font-medium">Project</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {projects.find((p) => p.id === selectedFile.project_id)
                        ?.name || selectedFile.project_id}
                    </p>
                  </div>
                )}
                {selectedFile.uploaded_by && (
                  <div>
                    <Label className="text-sm font-medium">Uploaded By</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedFile.uploaded_by}
                    </p>
                  </div>
                )}
              </div>
              {selectedFile.metadata && (
                <div>
                  <Label className="text-sm font-medium">Metadata</Label>
                  <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-x-auto">
                    {JSON.stringify(selectedFile.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFile(null)}>
              Close
            </Button>
            {selectedFile && (
              <Button onClick={() => downloadFile(selectedFile)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

