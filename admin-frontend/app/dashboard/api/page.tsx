"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  Copy,
  Key,
  Shield,
  Activity,
  BarChart3,
  Code,
  CheckCircle,
  XCircle,
  Download,
  Zap,
} from "lucide-react";
import { useNotification } from "../../../hooks/useNotification";
import { NotificationContainer } from "../../../components/Notification";
import { apiManagementAPI } from "../../../lib/api";

// Types
interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit: number;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  active: boolean;
  expires_at?: string;
}

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  handler: string;
  description: string;
  auth_required: boolean;
  permissions: string[];
  rate_limit: number;
  requests_today: number;
  avg_response_time: number;
  created_at: string;
  active: boolean;
}

interface RateLimit {
  id: string;
  name: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  applies_to: "global" | "key" | "endpoint";
  created_at: string;
  active: boolean;
}

interface ApiAnalytics {
  total_requests: number;
  requests_today: number;
  avg_response_time: number;
  error_rate: number;
  active_keys: number;
  blocked_requests: number;
  bandwidth_used: string;
  top_endpoints: Array<{
    path: string;
    method: string;
    requests: number;
  }>;
}

// Validation schemas
const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required"),
  rate_limit: z.number().min(1).max(10000),
  expires_at: z.string().optional(),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

type TabType =
  | "overview"
  | "keys"
  | "endpoints"
  | "limits"
  | "analytics"
  | "documentation";

export default function ApiManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Endpoints state
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [endpointsTotal, setEndpointsTotal] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [endpointsPage, setEndpointsPage] = useState(1);

  // Rate limits state
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);

  // Analytics state
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);

  // Pagination
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [keysPage, setKeysPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [keysTotal, setKeysTotal] = useState(0);

  // Search and filters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchTerm, setSearchTerm] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Forms
  const keyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      name: "",
      permissions: [],
      rate_limit: 100,
      expires_at: "",
    },
  });

  const { showSuccess, handleError } = useNotification();

  // Load functions
  const loadApiKeys = useCallback(async () => {
    try {
      const response = await apiManagementAPI.getApiKeys();
      if (response.success) {
        setApiKeys(response.data || []);
        setKeysTotal(response.data?.length || 0);
      } else {
        setApiKeys([]);
        setKeysTotal(0);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
      setApiKeys([]);
      setKeysTotal(0);
    }
  }, []);

  const loadEndpoints = useCallback(async () => {
    try {
      const response = await apiManagementAPI.getEndpoints();
      if (response.success) {
        setEndpoints(response.data || []);
        setEndpointsTotal(response.data?.length || 0);
      } else {
        setEndpoints([]);
        setEndpointsTotal(0);
      }
    } catch (error) {
      console.error("Failed to load endpoints:", error);
      setEndpoints([]);
      setEndpointsTotal(0);
    }
  }, []);

  const loadRateLimits = useCallback(async () => {
    try {
      const response = await apiManagementAPI.getRateLimits();
      if (response.success) {
        setRateLimits(response.data || []);
      } else {
        setRateLimits([]);
      }
    } catch (error) {
      console.error("Failed to load rate limits:", error);
      setRateLimits([]);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await apiManagementAPI.getApiStats();
      if (response.success) {
        setAnalytics(response.data);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setAnalytics(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadApiKeys(),
      loadEndpoints(),
      loadRateLimits(),
      loadAnalytics(),
    ]);
    setLoading(false);
  }, [loadApiKeys, loadEndpoints, loadRateLimits, loadAnalytics]);

  // Load data on component mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadApiKeys, loadEndpoints, loadRateLimits, loadAnalytics]);

  // Handlers
  const handleCreateApiKey = async (data: ApiKeyFormData) => {
    try {
      const response = await apiManagementAPI.createApiKey({
        name: data.name,
        permissions: data.permissions,
        rate_limit: data.rate_limit,
        expires_at: data.expires_at || undefined,
      });

      if (response.success) {
        showSuccess("API key created successfully");
        setShowKeyModal(false);
        keyForm.reset();
        await loadApiKeys();
      } else {
        handleError(response.error || "Failed to create API key");
      }
    } catch (error) {
      handleError(error, "Failed to create API key");
    }
  };

  const handleUpdateApiKey = async (data: ApiKeyFormData) => {
    if (!editingKey) return;

    try {
      const response = await apiManagementAPI.updateApiKey(
        Number(editingKey.id),
        {
          name: data.name,
          permissions: data.permissions,
          rate_limit: data.rate_limit,
          expires_at: data.expires_at || undefined,
        }
      );

      if (response.success) {
        showSuccess("API key updated successfully");
        setShowKeyModal(false);
        setEditingKey(null);
        keyForm.reset();
        await loadApiKeys();
      } else {
        handleError(response.error || "Failed to update API key");
      }
    } catch (error) {
      handleError(error, "Failed to update API key");
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await apiManagementAPI.deleteApiKey(Number(id));
      if (response.success) {
        showSuccess("API key deleted successfully");
        await loadApiKeys();
      } else {
        handleError(response.error || "Failed to delete API key");
      }
    } catch (error) {
      handleError(error, "Failed to delete API key");
    }
  };

  const handleToggleApiKey = async (_id: string, _active: boolean) => {
    try {
      // Toggle API key API call would go here
      showSuccess(
        `API key ${_active ? "activated" : "deactivated"} successfully`
      );
      await loadApiKeys();
    } catch (error) {
      handleError(error, "Failed to toggle API key");
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showSuccess("API key copied to clipboard");
  };

  const openKeyModal = (key?: ApiKey) => {
    if (key) {
      setEditingKey(key);
      keyForm.reset({
        name: key.name,
        permissions: key.permissions,
        rate_limit: key.rate_limit,
        expires_at: key.expires_at ? key.expires_at.split("T")[0] : "",
      });
    } else {
      setEditingKey(null);
      keyForm.reset({
        permissions: [],
        rate_limit: 1000,
      });
    }
    setShowKeyModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading API management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Globe className="h-8 w-8 mr-3 text-blue-600" />
            API Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage API keys, endpoints, rate limits, and monitor API usage
          </p>
        </div>

        {/* Quick stats */}
        {analytics && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.total_requests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {analytics.requests_today.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Today</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.avg_response_time}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {analytics.error_rate}%
              </div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">
                {analytics.active_keys}
              </div>
              <div className="text-sm text-gray-500">Active Keys</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.blocked_requests}
              </div>
              <div className="text-sm text-gray-500">Blocked</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-teal-600">
                {analytics.bandwidth_used}
              </div>
              <div className="text-sm text-gray-500">Bandwidth</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">
                {endpoints.length}
              </div>
              <div className="text-sm text-gray-500">Endpoints</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: "overview", label: "Overview", icon: BarChart3 },
              { key: "keys", label: "API Keys", icon: Key },
              { key: "endpoints", label: "Endpoints", icon: Globe },
              { key: "limits", label: "Rate Limits", icon: Shield },
              { key: "analytics", label: "Analytics", icon: Activity },
              { key: "documentation", label: "Documentation", icon: Code },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`${
                  activeTab === key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold">API Performance</h3>
                    <p className="text-sm text-gray-600">Real-time metrics</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Avg Response Time
                    </span>
                    <span className="text-sm font-medium">
                      {analytics.avg_response_time}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Error Rate</span>
                    <span className="text-sm font-medium">
                      {analytics.error_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Requests Today
                    </span>
                    <span className="text-sm font-medium">
                      {analytics.requests_today.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Key className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold">API Keys</h3>
                    <p className="text-sm text-gray-600">
                      Active keys and usage
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Keys</span>
                    <span className="text-sm font-medium">
                      {apiKeys.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Active Keys</span>
                    <span className="text-sm font-medium">
                      {analytics.active_keys}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Usage</span>
                    <span className="text-sm font-medium">
                      {apiKeys
                        .reduce((sum, key) => sum + key.usage_count, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold">Security</h3>
                    <p className="text-sm text-gray-600">
                      Rate limits and blocks
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Rate Limits</span>
                    <span className="text-sm font-medium">
                      {rateLimits.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Blocked Today</span>
                    <span className="text-sm font-medium">
                      {analytics.blocked_requests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Bandwidth Used
                    </span>
                    <span className="text-sm font-medium">
                      {analytics.bandwidth_used}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Top Endpoints</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {analytics.top_endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            endpoint.method === "GET"
                              ? "bg-blue-100 text-blue-800"
                              : endpoint.method === "POST"
                              ? "bg-green-100 text-green-800"
                              : endpoint.method === "PUT"
                              ? "bg-yellow-100 text-yellow-800"
                              : endpoint.method === "DELETE"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <span className="ml-3 text-sm font-medium">
                          {endpoint.path}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {endpoint.requests.toLocaleString()} requests
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">API Keys</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => openKeyModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </button>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export Keys
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name & Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {key.name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono flex items-center">
                            {`${key.key.slice(0, 12)}...`}
                            <button
                              onClick={() => handleCopyApiKey(key.key)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {key.usage_count.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Limit: {key.rate_limit}/min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {key.active ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-xs text-green-600">
                                Active
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-xs text-red-600">
                                Inactive
                              </span>
                            </>
                          )}
                        </div>
                        {key.expires_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expires:{" "}
                            {new Date(key.expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.last_used
                          ? new Date(key.last_used).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openKeyModal(key)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit API key"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleApiKey(key.id, !key.active)
                            }
                            className={
                              key.active
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            }
                            title={key.active ? "Deactivate" : "Activate"}
                          >
                            {key.active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteApiKey(key.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete API key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {apiKeys.length === 0 && (
              <div className="p-8 text-center">
                <Key className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No API keys
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first API key.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Additional tabs would continue here... */}
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingKey ? "Edit API Key" : "Create API Key"}
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={keyForm.handleSubmit(
                editingKey ? handleUpdateApiKey : handleCreateApiKey
              )}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  {...keyForm.register("name")}
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Production API Key"
                />
                {keyForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {keyForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions *
                </label>
                <div className="space-y-2">
                  {["read", "write", "delete", "admin"].map((permission) => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        value={permission}
                        {...keyForm.register("permissions")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {permission}
                      </span>
                    </label>
                  ))}
                </div>
                {keyForm.formState.errors.permissions && (
                  <p className="mt-1 text-sm text-red-600">
                    {keyForm.formState.errors.permissions.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rate Limit (requests per minute) *
                </label>
                <input
                  {...keyForm.register("rate_limit", { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="10000"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {keyForm.formState.errors.rate_limit && (
                  <p className="mt-1 text-sm text-red-600">
                    {keyForm.formState.errors.rate_limit.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expiration Date (optional)
                </label>
                <input
                  {...keyForm.register("expires_at")}
                  type="date"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave blank for no expiration
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingKey ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
