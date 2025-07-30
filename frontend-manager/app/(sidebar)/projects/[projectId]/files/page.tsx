"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createDefaultKrapi } from "@/lib/krapi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import {
  Button,
  IconButton,
  InfoBlock,
  Input,
} from "@/components/styled";
import {
  FiFile,
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiArchive,
  FiPlus,
  FiDownload,
  FiTrash2,
  FiSearch,
  FiEye,
  FiMoreVertical,
  FiUpload,
  FiFolder,
} from "react-icons/fi";

interface FileItem {
  id: string;
  name: string;
  filename: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await krapi.storage.listFiles({ projectId });
      
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

  const getFileIcon = (mime_type: string) => {
    if (mime_type.startsWith("image/")) return <FiImage className="h-5 w-5" />;
    if (mime_type.startsWith("video/")) return <FiVideo className="h-5 w-5" />;
    if (mime_type.startsWith("audio/")) return <FiMusic className="h-5 w-5" />;
    if (mime_type.includes("zip") || mime_type.includes("archive")) return <FiArchive className="h-5 w-5" />;
    if (mime_type.includes("text") || mime_type.includes("document")) return <FiFileText className="h-5 w-5" />;
    return <FiFile className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Files</h1>
          <p className="text-text/60 mt-1">
            Manage files and media for this project
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="default" size="lg">
            <FiUpload className="mr-2 h-4 w-4" />
            Upload Files
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
              <FiFile className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Size</p>
              <p className="text-2xl font-bold text-text mt-1">
                {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiFolder className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Avg File Size</p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.length > 0
                  ? formatFileSize(
                      files.reduce((sum, file) => sum + file.size, 0) / files.length
                    )
                  : "0 Bytes"}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiArchive className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">Files</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <FiFile className="h-12 w-12 text-text/20 mx-auto mb-4" />
            <p className="text-text/60">
              {searchTerm
                ? "No files found matching your search"
                : "No files yet. Upload your first file to get started."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-secondary/50">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-6 hover:bg-secondary/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {getFileIcon(file.mime_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-text">{file.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{file.mime_type}</span>
                        <span>Uploaded: {new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <IconButton
                      icon={FiEye}
                      variant="secondary"
                      size="sm"
                      title="Preview File"
                      onClick={() => {
                        const url = krapi.storage.getFileUrl(file.id);
                        window.open(url, "_blank");
                      }}
                    />
                    <IconButton
                      icon={FiDownload}
                      variant="secondary"
                      size="sm"
                      title="Download File"
                    />
                    <IconButton
                      icon={FiTrash2}
                      variant="secondary"
                      size="sm"
                      title="Delete File"
                    />
                    <IconButton
                      icon={FiMoreVertical}
                      variant="secondary"
                      size="sm"
                      title="More Options"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Block */}
      <InfoBlock
        title="File Storage"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            Upload and manage files for your project. Files are automatically
            optimized and served through a CDN for fast delivery.
          </p>
          <p>
            <strong>Supported file types:</strong> Images (JPG, PNG, GIF, WebP),
            Documents (PDF, DOC, TXT), Videos (MP4, WebM), Audio (MP3, WAV), and more.
          </p>
          <p>
            <strong>File size limit:</strong> 100MB per file
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}