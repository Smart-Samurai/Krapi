"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { filesAPI } from "@/lib/api";
import { FileMetadata, ApiResponse, FileFilters } from "@/types";
import { fileUploadSchema, FileUploadInput } from "@/lib/schemas";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";

export default function FilesPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [filters, setFilters] = useState<FileFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { handleError, showSuccess } = useNotification();

  const uploadForm = useForm<FileUploadInput>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      access_level: "public",
      description: "",
    },
  });

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response: ApiResponse<FileMetadata[]> = await filesAPI.getAllFiles(
        filters
      );
      if (response.success && response.data) {
        setFiles(response.data);
      } else {
        handleError(response.error || "Failed to load files");
      }
    } catch (err) {
      handleError(err, "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [filters, handleError]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadFile = async (data: FileUploadInput) => {
    try {
      console.log("Upload data:", {
        fileName: data.file.name,
        fileSize: data.file.size,
        fileType: data.file.type,
        accessLevel: data.access_level,
        description: data.description,
      });

      const response: ApiResponse<FileMetadata> = await filesAPI.uploadFile(
        data.file,
        data.access_level,
        data.description
      );

      if (response.success && response.data) {
        setFiles([...files, response.data]);
        setShowUploadModal(false);
        uploadForm.reset();
        showSuccess(`File '${data.file.name}' uploaded successfully`);
      } else {
        handleError(response.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      handleError(err, "Failed to upload file");
    }
  };

  const handleEditFile = async () => {
    if (!editingFile) return;

    try {
      const response: ApiResponse<FileMetadata> = await filesAPI.updateFile(
        editingFile.id,
        {
          access_level: editingFile.access_level,
          description: editingFile.description,
        }
      );

      if (response.success && response.data) {
        setFiles(
          files.map((f) => (f.id === editingFile.id ? response.data! : f))
        );
        setEditingFile(null);
        showSuccess("File updated successfully");
      } else {
        handleError(response.error || "Failed to update file");
      }
    } catch (err) {
      handleError(err, "Failed to update file");
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      const response: ApiResponse = await filesAPI.deleteFile(id);
      if (response.success) {
        setFiles(files.filter((f) => f.id !== id));
        showSuccess("File deleted successfully");
      } else {
        handleError(response.error || "Failed to delete file");
      }
    } catch (err) {
      handleError(err, "Failed to delete file");
    }
  };

  const handleDownloadFile = async (id: number, filename: string) => {
    try {
      const response = await filesAPI.downloadFile(id);

      // Create blob from response
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err, "Failed to download file");
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm });
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case "public":
        return <Globe className="h-4 w-4 text-green-500" />;
      case "protected":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "private":
        return <Lock className="h-4 w-4 text-red-500" />;
      default:
        return <Globe className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    const baseClasses =
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1";
    switch (level) {
      case "public":
        return `${baseClasses} bg-green-100 text-green-700`;
      case "protected":
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case "private":
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (
      mimetype.includes("text/") ||
      mimetype.includes("json") ||
      mimetype.includes("xml")
    ) {
      return <FileText className="h-5 w-5 text-green-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Management</h1>
          <p className="text-gray-600">Upload and manage your files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value || "")}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        <div className="flex gap-4">
          <select
            value={filters.access_level || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                access_level: (e?.target?.value || "") as
                  | "public"
                  | "protected"
                  | "private"
                  | undefined,
              })
            }
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Access Levels</option>
            <option value="public">Public</option>
            <option value="protected">Protected</option>
            <option value="private">Private</option>
          </select>

          <input
            type="text"
            placeholder="Filter by type..."
            value={filters.mimetype || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                mimetype: e?.target?.value || undefined,
              })
            }
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <NotificationContainer />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getFileIcon(file.mimetype)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {file.original_name}
                      </div>
                      {file.description && (
                        <div className="text-sm text-gray-500">
                          {file.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.mimetype}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getAccessLevelBadge(file.access_level)}>
                    {getAccessLevelIcon(file.access_level)}
                    {file.access_level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(file.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() =>
                      handleDownloadFile(file.id, file.original_name)
                    }
                    className="text-blue-600 hover:text-blue-900"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingFile(file)}
                    className="text-green-600 hover:text-green-900"
                    title="Edit"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-900"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Upload File</h3>

            <form
              onSubmit={uploadForm.handleSubmit(handleUploadFile)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e?.target?.files?.[0];
                    if (file) {
                      uploadForm.setValue("file", file);
                      uploadForm.clearErrors("file");
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {uploadForm.formState.errors.file && (
                  <p className="mt-1 text-sm text-red-600">
                    {uploadForm.formState.errors.file.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Level
                </label>
                <select
                  {...uploadForm.register("access_level")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="protected">Protected</option>
                  <option value="private">Private</option>
                </select>
                {uploadForm.formState.errors.access_level && (
                  <p className="mt-1 text-sm text-red-600">
                    {uploadForm.formState.errors.access_level.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...uploadForm.register("description")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Optional description"
                />
                {uploadForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {uploadForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    uploadForm.reset();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadForm.formState.isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadForm.formState.isSubmitting
                    ? "Uploading..."
                    : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit File</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  File Name
                </label>
                <input
                  type="text"
                  value={editingFile.original_name}
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Level
                </label>
                <select
                  value={editingFile.access_level}
                  onChange={(e) =>
                    setEditingFile({
                      ...editingFile,
                      access_level: (e?.target?.value || "public") as
                        | "public"
                        | "protected"
                        | "private",
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="protected">Protected</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={editingFile.description || ""}
                  onChange={(e) =>
                    setEditingFile({
                      ...editingFile,
                      description: e?.target?.value || "",
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditFile}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Update File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
