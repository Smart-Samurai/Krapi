"use client";

import { useState, useEffect } from "react";
import { contentAPI, routesAPI } from "@/lib/api";
import { ContentItem, ContentRoute } from "@/types";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Database,
  Calendar,
  Link,
} from "lucide-react";

export default function ContentManagementPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [routes, setRoutes] = useState<ContentRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [newItem, setNewItem] = useState({
    key: "",
    value: "",
    description: "",
    route_path: "/default",
    content_type: "json",
  });

  useEffect(() => {
    loadContent();
    loadRoutes();
  }, []);

  const loadContent = async () => {
    try {
      const response = await contentAPI.getAllContent();
      if (response.success) {
        setContent(response.data);
      }
    } catch (error) {
      console.error("Failed to load content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await routesAPI.getAllRoutes();
      if (response.success) {
        setRoutes(response.data);
      }
    } catch (error) {
      console.error("Failed to load routes:", error);
    }
  };

  const handleCreate = async () => {
    try {
      const valueToStore =
        newItem.value.trim().startsWith("{") ||
        newItem.value.trim().startsWith("[")
          ? JSON.parse(newItem.value)
          : newItem.value;

      // Use the selected route path directly instead of route_id
      const selectedRoutePath = selectedRoute || newItem.route_path;

      const response = await contentAPI.createContent({
        key: newItem.key,
        data: valueToStore,
        description: newItem.description || undefined,
        route_path: selectedRoutePath,
        content_type: newItem.content_type,
      });

      if (response.success) {
        await loadContent();
        setIsCreating(false);
        setNewItem({
          key: "",
          value: "",
          description: "",
          route_path: "/default",
          content_type: "json",
        });
        setSelectedRoute("");
      }
    } catch (error) {
      console.error("Failed to create content:", error);
      alert(
        "Failed to create content. Please check your JSON format if applicable."
      );
    }
  };

  const handleUpdate = async (item: ContentItem) => {
    try {
      const valueToStore =
        typeof item.value === "string" &&
        (item.value.trim().startsWith("{") || item.value.trim().startsWith("["))
          ? JSON.parse(item.value)
          : item.value;

      const response = await contentAPI.updateContent(item.id, {
        data: valueToStore,
        description: item.description || undefined,
      });

      if (response.success) {
        await loadContent();
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to update content:", error);
      alert(
        "Failed to update content. Please check your JSON format if applicable."
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this content item?")) {
      return;
    }

    try {
      const response = await contentAPI.deleteContent(id);
      if (response.success) {
        await loadContent();
      }
    } catch (error) {
      console.error("Failed to delete content:", error);
    }
  };

  const copyApiUrl = async (item: ContentItem) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
    const apiUrl = `${baseUrl}/api/content${item.route_path}/${item.key}`;

    try {
      await navigator.clipboard.writeText(apiUrl);
      alert(`API URL copied to clipboard: ${apiUrl}`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = apiUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert(`API URL copied to clipboard: ${apiUrl}`);
    }
  };

  const filteredContent = content.filter(
    (item) =>
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatValue = (value: unknown) => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-900 dark:text-text-50">
                Content Management
              </h1>
              <p className="mt-1 text-sm text-text-500 dark:text-text-500">
                Manage your API content data
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 dark:bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-text-400 dark:text-text-600" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-background-300 dark:border-background-300 rounded-md leading-5 bg-background-100 dark:bg-background-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-4">
              Create New Content
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                  Key
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={newItem.key}
                  onChange={(e) =>
                    setNewItem({ ...newItem, key: e.target.value })
                  }
                  placeholder="e.g., homepage.title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                  Value
                </label>
                <textarea
                  rows={4}
                  className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                  value={newItem.value}
                  onChange={(e) =>
                    setNewItem({ ...newItem, value: e.target.value })
                  }
                  placeholder="Content value (can be JSON object, array, or plain text)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                  Route Assignment
                </label>
                <select
                  className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                >
                  <option value="">Select a route...</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.path}>
                      {route.path} ({route.name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-text-500 dark:text-text-500">
                  Choose which route this content belongs to
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Content Type
                  </label>
                  <select
                    className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={newItem.content_type || "json"}
                    onChange={(e) =>
                      setNewItem({ ...newItem, content_type: e.target.value })
                    }
                  >
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                    <option value="html">HTML</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Brief description of this content"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewItem({
                      key: "",
                      value: "",
                      description: "",
                      route_path: "/default",
                      content_type: "json",
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-background-300 dark:border-background-300 text-sm font-medium rounded-md text-text-700 dark:text-text-300 bg-background-100 dark:bg-background-100 hover:bg-background-50 dark:bg-background-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newItem.key || !newItem.value}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 dark:bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Documentation Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Database className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              API Access Levels
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">
                <strong>Public:</strong> Accessible without authentication
              </p>
              <p className="mb-2">
                <strong>Protected:</strong> Requires authentication but no
                special permissions
              </p>
              <p className="mb-4">
                <strong>Private:</strong> Requires authentication and admin
                permissions
              </p>

              <h4 className="font-medium mb-2">
                Connecting from External Systems:
              </h4>
              <p className="mb-2">
                Base API URL:{" "}
                <code className="bg-background-100 dark:bg-background-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_API_BASE_URL ||
                    window.location.origin}
                  /api
                </code>
              </p>
              <p className="mb-2">
                Public content:{" "}
                <code className="bg-background-100 dark:bg-background-100 px-2 py-1 rounded">
                  GET /api/content/[route_path]/[key]
                </code>
              </p>
              <p className="mb-2">
                Protected/Private content: Include{" "}
                <code className="bg-background-100 dark:bg-background-100 px-2 py-1 rounded">
                  Authorization: Bearer [token]
                </code>{" "}
                header
              </p>
              <p>
                Get token from:{" "}
                <code className="bg-background-100 dark:bg-background-100 px-2 py-1 rounded">
                  POST /api/auth/login
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-background-100 dark:bg-background-100 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <li key={item.id} className="px-6 py-4">
                {editingItem?.id === item.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                        Key
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-background-100 dark:bg-background-100"
                        value={editingItem.key}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                        Value
                      </label>
                      <textarea
                        rows={6}
                        className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                        value={formatValue(editingItem.value)}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                        Description
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-background-300 dark:border-background-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={editingItem.description || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="inline-flex items-center px-3 py-2 border border-background-300 dark:border-background-300 text-sm font-medium rounded-md text-text-700 dark:text-text-300 bg-background-100 dark:bg-background-100 hover:bg-background-50 dark:bg-background-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(editingItem)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 dark:bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <Database className="h-5 w-5 text-text-400 dark:text-text-600" />
                        <h3 className="text-lg font-medium text-text-900 dark:text-text-50 truncate">
                          {item.key}
                        </h3>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-text-500 dark:text-text-500">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <pre className="text-sm text-text-600 dark:text-text-400 bg-background-50 dark:bg-background-50 p-3 rounded-md overflow-x-auto max-h-40">
                          {formatValue(item.value)}
                        </pre>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center text-sm text-text-500 dark:text-text-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Updated: {new Date(item.updated_at).toLocaleString()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.route_path}
                          </span>
                          <button
                            onClick={() => copyApiUrl(item)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            title="Copy API URL"
                          >
                            <Link className="h-3 w-3 mr-1" />
                            Copy API URL
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 flex space-x-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="inline-flex items-center p-2 border border-background-300 dark:border-background-300 text-sm font-medium rounded-md text-text-700 dark:text-text-300 bg-background-100 dark:bg-background-100 hover:bg-background-50 dark:bg-background-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center p-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-background-100 dark:bg-background-100 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyApiUrl(item)}
                        className="inline-flex items-center p-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-background-100 dark:bg-background-100 hover:bg-green-50"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            <li>
              <div className="px-6 py-12 text-center">
                <Database className="mx-auto h-12 w-12 text-text-400 dark:text-text-600" />
                <h3 className="mt-2 text-sm font-medium text-text-900 dark:text-text-50">
                  {searchTerm ? "No matching content found" : "No content yet"}
                </h3>
                <p className="mt-1 text-sm text-text-500 dark:text-text-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "Get started by creating your first content item."}
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
