"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createDefaultKrapi, FileInfo, Scope } from "@/lib/krapi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Plus,
  Download,
  Trash2,
  Search,
  Eye,
  MoreVertical,
  Upload,
  Folder,
} from "lucide-react";
import { InfoBlock } from "@/components/styled/InfoBlock";
import { toast } from "sonner";

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const { hasScope } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (krapi) {
      fetchFiles();
    }
  }, [projectId, krapi]);

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await krapi.storage.getFiles(projectId);

      if (result.success && result.data) {
        setFiles(result.data);
      } else {
        setError(result.error || "Failed to fetch files");
      }
    } catch (err) {
      setError("An error occurred while fetching files");
      console.error("Error fetching files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasScope(Scope.STORAGE_WRITE)) {
      toast.error("You don't have permission to upload files");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await krapi.storage.uploadFile(
        projectId,
        file,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        toast.success("File uploaded successfully");
        await fetchFiles(); // Refresh the file list
      } else {
        toast.error(result.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("An error occurred while uploading the file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileDelete = async (fileId: string, fileName: string) => {
    if (!hasScope(Scope.STORAGE_DELETE)) {
      toast.error("You don't have permission to delete files");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const result = await krapi.storage.deleteFile(projectId, fileId);

      if (result.success) {
        toast.success("File deleted successfully");
        setFiles(files.filter((f) => f.id !== fileId));
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      toast.error("An error occurred while deleting the file");
    }
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const result = await krapi.storage.downloadFile(projectId, fileId);

      if (result.success && result.data) {
        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(result.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("File downloaded successfully");
      } else {
        toast.error("Failed to download file");
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("An error occurred while downloading the file");
    }
  };

  const getFileIcon = (mime_type: string) => {
    if (mime_type.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (mime_type.startsWith("video/")) return <Video className="h-5 w-5" />;
    if (mime_type.startsWith("audio/")) return <Music className="h-5 w-5" />;
    if (mime_type.includes("zip") || mime_type.includes("archive"))
      return <Archive className="h-5 w-5" />;
    if (mime_type.includes("text") || mime_type.includes("document"))
      return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredFiles = files.filter((file) =>
    file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/60">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <InfoBlock title="Error" variant="error">
          {error}
        </InfoBlock>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Files</h1>
          <p className="text-text/60 mt-1">
            Manage files and media for this project
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !hasScope(Scope.STORAGE_WRITE)}
            title={
              !hasScope(Scope.STORAGE_WRITE)
                ? "You don't have permission to upload files"
                : undefined
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Files"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Files</p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <File className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Size</p>
              <p className="text-2xl font-bold text-text mt-1">
                {formatFileSize(
                  files.reduce((acc, file) => acc + file.size, 0)
                )}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Folder className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Average File Size
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.length > 0
                  ? formatFileSize(
                      files.reduce((acc, file) => acc + file.size, 0) /
                        files.length
                    )
                  : "0 Bytes"}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <File className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-5 w-5" />
        <Input
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-background border border-secondary rounded-lg">
          <Folder className="h-12 w-12 text-text/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text/60 mb-2">
            {searchTerm ? "No files found" : "No files uploaded yet"}
          </h3>
          <p className="text-sm text-text/40 mb-6">
            {searchTerm
              ? "Try adjusting your search criteria"
              : "Upload your first file to get started"}
          </p>
          {!searchTerm && (
            <Button
              variant="default"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-background border border-secondary rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {file.original_name}
                    </p>
                    <p className="text-xs text-text/60">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleFileDownload(file.id, file.original_name)
                    }
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleFileDelete(file.id, file.original_name)
                    }
                    title={
                      !hasScope(Scope.STORAGE_DELETE)
                        ? "No permission to delete"
                        : "Delete"
                    }
                    disabled={!hasScope(Scope.STORAGE_DELETE)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-text/60">
                <p>Type: {file.mime_type}</p>
                <p>
                  Uploaded: {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
