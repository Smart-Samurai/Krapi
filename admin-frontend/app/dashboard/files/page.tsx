"use client";

import { useState } from "react";
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
import { createDefaultKrapi } from "@/lib/krapi";
import { FileInfo } from "@/lib/krapi/types";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";

export default function FilesPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { handleError, _showSuccess } = useNotification();

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await createDefaultKrapi().storage.listFiles();
      if (response.success) {
        setFiles(response.data || []);
      }
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const [_handleUpload] = async (file: File) => {
    // Placeholder implementation
  };

  const [_handleDelete] = async (fileId: string) => {
    // Placeholder implementation
  };

  const [_handleDownload] = async (fileId: string, _filename: string) => {
    // Placeholder implementation
  };

  const handleSearch = () => {
    // The new API does not support search directly on the listFiles endpoint.
    // This function is kept for consistency with the original file, but it won't filter.
    // If search functionality is needed, it would require a backend endpoint.
    console.warn("Search functionality is not implemented for the new API.");
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case "public":
        return <Globe className="h-4 w-4 text-accent-500" />;
      case "protected":
        return <Shield className="h-4 w-4 text-secondary-500" />;
      case "private":
        return <Lock className="h-4 w-4 text-destructive-500" />;
      default:
        return <Globe className="h-4 w-4 text-text-500" />;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    const baseClasses =
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1";
    switch (level) {
      case "public":
        return `${baseClasses} bg-accent-100 text-accent-700`;
      case "protected":
        return `${baseClasses} bg-secondary-100 text-secondary-700`;
      case "private":
        return `${baseClasses} bg-destructive-100 text-destructive-700`;
      default:
        return `${baseClasses} bg-background-100 text-text-700`;
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-primary-500" />;
    } else if (
      mimetype.includes("text/") ||
      mimetype.includes("json") ||
      mimetype.includes("xml")
    ) {
      return <FileText className="h-5 w-5 text-accent-500" />;
    } else {
      return <File className="h-5 w-5 text-text-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-900">File Management</h1>
          <p className="text-text-600">Upload and manage your files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-background-100 dark:bg-background-100 p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value || "")}
                className="w-full pl-10 pr-4 py-2 border border-background-300 rounded-md"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-400" />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Search
          </button>
        </div>

        <div className="flex gap-4">
          {/* Access Level Filter - Removed as per new API */}
          <input
            type="text"
            placeholder="Filter by type..."
            value={searchTerm} // Using searchTerm for filtering by type as per new API
            onChange={(e) => setSearchTerm(e?.target?.value || "")}
            className="border border-background-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <NotificationContainer />

      <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-background-200">
          <thead className="bg-background-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider">
                Access Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-background-200">
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getFileIcon(file.mime_type)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-text-900">
                        {file.name}
                      </div>
                      {/* Description field removed as per new API */}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-500">
                  {file.mime_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-500">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getAccessLevelBadge("public")}>
                    {getAccessLevelIcon("public")}
                    Public
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-500">
                  {new Date(file.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => _handleDownload(file.id, file.name)}
                    className="text-primary-600 hover:text-primary-900"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {/* Edit functionality removed as per new API */}
                  <button
                    onClick={() => _handleDelete(file.id)}
                    className="text-destructive-600 hover:text-destructive-900"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Upload File</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fileInput = document.getElementById(
                  "file-upload"
                ) as HTMLInputElement;
                if (
                  fileInput &&
                  fileInput.files &&
                  fileInput.files.length > 0
                ) {
                  _handleUpload(fileInput.files[0]);
                } else {
                  handleError("Please select a file to upload.");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="file-upload"
                  className="block text-sm font-medium text-text-700"
                >
                  File
                </label>
                <input
                  type="file"
                  id="file-upload"
                  className="mt-1 block w-full border border-background-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Access Level and Description fields removed as per new API */}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                  }}
                  className="px-4 py-2 border border-background-300 rounded-md text-sm font-medium text-text-700 hover:bg-background-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit File Modal - Removed as per new API */}
    </div>
  );
}
