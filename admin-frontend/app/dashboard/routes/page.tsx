"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Globe,
  Lock,
  Shield,
  Copy,
  ExternalLink,
} from "lucide-react";
import { routesAPI } from "@/lib/api";
import { ContentRoute, ApiResponse } from "@/types";
import {
  createRouteSchema,
  updateRouteSchema,
  CreateRouteFormData,
  UpdateRouteFormData,
} from "@/lib/validations";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<ContentRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<ContentRoute | null>(null);

  // Create route form
  const createForm = useForm({
    resolver: zodResolver(createRouteSchema),
    defaultValues: {
      path: "",
      name: "",
      description: "",
      access_level: "public" as const,
      parent_id: undefined,
    },
  });

  // Edit route form
  const editForm = useForm({
    resolver: zodResolver(updateRouteSchema),
    defaultValues: {
      path: "",
      name: "",
      description: "",
      access_level: "public" as const,
      parent_id: undefined,
    },
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response: ApiResponse<ContentRoute[]> =
        await routesAPI.getAllRoutes();
      if (response.success && response.data) {
        setRoutes(response.data);
      } else {
        setError(response.error || "Failed to load routes");
      }
    } catch (err) {
      setError("Failed to load routes");
      console.error("Error loading routes:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyApiUrl = (path: string) => {
    const apiUrl = `${window.location.protocol}//${window.location.host}/api/content${path}`;
    navigator.clipboard.writeText(apiUrl);
    // Could show a toast notification here
  };

  const handleCreateRoute = async (data: CreateRouteFormData) => {
    try {
      const response: ApiResponse<ContentRoute> = await routesAPI.createRoute(
        data
      );
      if (response.success) {
        setRoutes([...routes, response.data!]);
        setShowCreateModal(false);
        createForm.reset();
      } else {
        setError(response.error || "Failed to create route");
      }
    } catch (err) {
      setError("Failed to create route");
      console.error("Error creating route:", err);
    }
  };

  const handleEditRoute = async (data: UpdateRouteFormData) => {
    if (!editingRoute) return;

    try {
      const response: ApiResponse<ContentRoute> = await routesAPI.updateRoute(
        editingRoute.id,
        data
      );
      if (response.success) {
        setRoutes(
          routes.map((r) => (r.id === editingRoute.id ? response.data! : r))
        );
        setEditingRoute(null);
        editForm.reset();
      } else {
        setError(response.error || "Failed to update route");
      }
    } catch (err) {
      setError("Failed to update route");
      console.error("Error updating route:", err);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this route? This will also delete all content in this route."
      )
    ) {
      return;
    }

    try {
      const response: ApiResponse = await routesAPI.deleteRoute(id);
      if (response.success) {
        setRoutes(routes.filter((r) => r.id !== id));
      } else {
        setError(response.error || "Failed to delete route");
      }
    } catch (err) {
      setError("Failed to delete route");
      console.error("Error deleting route:", err);
    }
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

  const parentRoutes = routes.filter((r) => !r.parent_id);

  const startEditingRoute = (route: ContentRoute) => {
    setEditingRoute(route);
    editForm.reset({
      path: route.path,
      name: route.name,
      description: route.description || "",
      access_level: route.access_level,
      parent_id: route.parent_id,
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
          <p className="text-gray-600">
            Manage your content routes and their structure
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Route
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routes.map((route) => {
              const parentRoute = routes.find((r) => r.id === route.parent_id);
              return (
                <tr key={route.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FolderTree className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {route.path}
                          </code>
                          <button
                            onClick={() => copyApiUrl(route.path)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy API URL"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <a
                            href={`/api/content${route.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                            title="Open API endpoint"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        {route.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {route.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {route.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getAccessLevelBadge(route.access_level)}>
                      {getAccessLevelIcon(route.access_level)}
                      {route.access_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {parentRoute ? parentRoute.name : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(route.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => startEditingRoute(route)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoute(route.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => copyApiUrl(route.path)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create New Route</h3>

            <form
              onSubmit={createForm.handleSubmit(handleCreateRoute)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Path
                </label>
                <input
                  type="text"
                  {...createForm.register("path")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="/api/v1/example"
                />
                {createForm.formState.errors.path && (
                  <p className="mt-1 text-sm text-red-600">
                    {createForm.formState.errors.path.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  {...createForm.register("name")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Example Route"
                />
                {createForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...createForm.register("description")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Optional description"
                />
                {createForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {createForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Level
                </label>
                <select
                  {...createForm.register("access_level")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="protected">Protected</option>
                  <option value="private">Private</option>
                </select>
                {createForm.formState.errors.access_level && (
                  <p className="mt-1 text-sm text-red-600">
                    {createForm.formState.errors.access_level.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Parent Route
                </label>
                <select
                  {...createForm.register("parent_id", {
                    setValueAs: (value) =>
                      value === "" ? undefined : parseInt(value),
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">No parent (root route)</option>
                  {parentRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} ({route.path})
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.parent_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {createForm.formState.errors.parent_id.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {editingRoute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Route</h3>

            <form
              onSubmit={editForm.handleSubmit(handleEditRoute)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Path
                </label>
                <input
                  type="text"
                  {...editForm.register("path")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {editForm.formState.errors.path && (
                  <p className="mt-1 text-sm text-red-600">
                    {editForm.formState.errors.path.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  {...editForm.register("name")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {editForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...editForm.register("description")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                {editForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {editForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Level
                </label>
                <select
                  {...editForm.register("access_level")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="protected">Protected</option>
                  <option value="private">Private</option>
                </select>
                {editForm.formState.errors.access_level && (
                  <p className="mt-1 text-sm text-red-600">
                    {editForm.formState.errors.access_level.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Parent Route
                </label>
                <select
                  {...editForm.register("parent_id", {
                    setValueAs: (value) =>
                      value === "" ? undefined : parseInt(value),
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">No parent (root route)</option>
                  {parentRoutes
                    .filter((r) => r.id !== editingRoute.id)
                    .map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name} ({route.path})
                      </option>
                    ))}
                </select>
                {editForm.formState.errors.parent_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {editForm.formState.errors.parent_id.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Update Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
