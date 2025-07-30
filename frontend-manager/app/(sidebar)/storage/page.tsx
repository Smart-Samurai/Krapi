"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  InfoBlock,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/styled";
import {
  FiFile,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiFolder,
  FiImage,
  FiFileText,
  FiFilm,
  FiMusic,
} from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project, FileInfo } from "@/lib/krapi-sdk/types";

export default function StoragePage() {
  const krapi = useKrapi();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [storageStats, setStorageStats] = useState<{
    used: number;
    limit: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles();
      fetchStorageStats();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await krapi.projects.getAll();
      if (response.success && response.data) {
        setProjects(response.data);
        if (response.data.length > 0 && !selectedProject) {
          setSelectedProject(response.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const response = await krapi.storage.getFiles(selectedProject);
      if (response.success && response.data) {
        setFiles(response.data);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      setError("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await krapi.storage.getStats(selectedProject);
      if (response.success && response.data) {
        setStorageStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching storage stats:", err);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedProject || !uploadFile) return;

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await krapi.storage.uploadFile(selectedProject, formData);

      if (response.success) {
        setIsUploadOpen(false);
        setUploadFile(null);
        fetchFiles();
        fetchStorageStats();
      } else {
        setError(response.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file");
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!selectedProject || !confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await krapi.storage.deleteFile(selectedProject, fileId);
      if (response.success) {
        fetchFiles();
        fetchStorageStats();
      } else {
        setError(response.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      setError("Failed to delete file");
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    if (!selectedProject) return;

    try {
      const response = await krapi.storage.downloadFile(selectedProject, fileId);
      if (response.success && response.data) {
        // Create a download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError(response.error || "Failed to download file");
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download file");
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FiImage;
    if (mimeType.startsWith("video/")) return FiFilm;
    if (mimeType.startsWith("audio/")) return FiMusic;
    if (mimeType.includes("pdf") || mimeType.includes("document")) return FiFileText;
    return FiFile;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Storage Management</h1>
          <p className="text-text/60 mt-1">
            Upload and manage files for your projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            onClick={() => setIsUploadOpen(true)}
            disabled={!selectedProject}
          >
            <FiUpload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      {error && (
        <InfoBlock variant="error" title="Error">
          {error}
        </InfoBlock>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <div className="bg-background border border-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Storage Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text/60">Used Space</span>
              <span className="font-medium text-text">
                {formatFileSize(storageStats.used)} / {formatFileSize(storageStats.limit)}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${(storageStats.used / storageStats.limit) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text/60">Total Files</span>
              <span className="font-medium text-text">{storageStats.count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-text/60">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 bg-background border border-secondary rounded-lg">
          <FiFolder className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No files yet</h3>
          <p className="text-text/60 mb-4">
            Upload your first file to get started
          </p>
          <Button
            variant="default"
            onClick={() => setIsUploadOpen(true)}
            disabled={!selectedProject}
          >
            <FiUpload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mime_type);
            return (
              <div
                key={file.id}
                className="bg-background border border-secondary rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadFile(file.id, file.name)}
                    >
                      <FiDownload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id, file.name)}
                    >
                      <FiTrash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <h4 className="font-medium text-text truncate mb-1" title={file.name}>
                  {file.name}
                </h4>
                <div className="space-y-1 text-sm text-text/60">
                  <p>{formatFileSize(file.size)}</p>
                  <p>{new Date(file.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Select a file to upload to your project storage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {uploadFile && (
              <div className="bg-secondary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-text">{uploadFile.name}</p>
                <p className="text-sm text-text/60">
                  {formatFileSize(uploadFile.size)}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadOpen(false);
                setUploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleFileUpload}
              disabled={!uploadFile}
            >
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}