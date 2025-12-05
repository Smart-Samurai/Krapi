/**
 * API Keys Page
 * 
 * Page for managing API keys for a project.
 * Provides API key creation, editing, deletion, and scope management.
 * 
 * @module app/(sidebar)/projects/[projectId]/api-keys/page
 * @example
 * // Automatically rendered at /projects/[projectId]/api-keys route
 */
/**
 * API Keys Page
 * 
 * Page for managing project API keys with scope configuration.
 * Provides API key creation, editing, deletion, and scope management.
 * 
 * @module app/(sidebar)/projects/[projectId]/api-keys/page
 * @example
 * // Automatically rendered at /projects/[projectId]/api-keys route
 */
"use client";

// Local type definition for ApiKey (to avoid importing SDK in client)
type ApiKey = {
  id: string;
  name: string;
  project_id: string;
  key?: string;
  scopes: string[];
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};
import {
  Plus,
  Edit,
  Trash2,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Code2,
  BookOpen,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import {
  PageLayout,
  PageHeader,
  ActionButton,
  EmptyState,
  CodeSnippet,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_token" && value) return value;
  }
  return localStorage.getItem("session_token");
}
import { ProjectScope } from "@/lib/krapi-constants";

/**
 * Scope Labels Mapping
 * 
 * Maps project scopes to human-readable labels.
 * Project-specific scopes only - global scopes like "projects:read" are reserved for admin users.
 * 
 * @constant {Record<string, string>}
 */
// Project-specific scopes only - these are for managing THIS project only
// Note: Global scopes like "projects:read" are NOT included here as they are
// reserved for the main KRAPI app admin users, not project users.
const scopeLabels: Record<string, string> = {
  [ProjectScope.USERS_READ]: "Read Users (in this project)",
  [ProjectScope.USERS_WRITE]: "Write Users (in this project)",
  [ProjectScope.USERS_DELETE]: "Delete Users (in this project)",
  [ProjectScope.COLLECTIONS_READ]: "Read Collections",
  [ProjectScope.COLLECTIONS_WRITE]: "Write Collections",
  [ProjectScope.COLLECTIONS_DELETE]: "Delete Collections",
  [ProjectScope.DOCUMENTS_READ]: "Read Documents",
  [ProjectScope.DOCUMENTS_WRITE]: "Write Documents",
  [ProjectScope.DOCUMENTS_DELETE]: "Delete Documents",
  [ProjectScope.FILES_READ]: "Read Files",
  [ProjectScope.FILES_WRITE]: "Write Files",
  [ProjectScope.FILES_DELETE]: "Delete Files",
  [ProjectScope.FUNCTIONS_EXECUTE]: "Execute Functions",
  [ProjectScope.EMAIL_SEND]: "Send Emails",
};

/**
 * API Keys Page Component
 * 
 * Displays and manages API keys for a project.
 * 
 * @returns {JSX.Element} API keys page
 */
export default function ApiKeysPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  // Form state for creating/editing API keys
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as string[],
    expires_at: "",
    metadata: {} as Record<string, unknown>,
  });

  const loadApiKeys = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/krapi/k1/apikeys?project_id=${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setApiKeys(result.data as ApiKey[]);
      } else {
        setError("Invalid response format");
      }
    } catch {
      setError("An error occurred while loading API keys");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateApiKey = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    try {
      const response = await fetch(`/api/krapi/k1/apikeys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          name: formData.name,
          scopes: formData.scopes,
          expires_at: formData.expires_at || undefined,
          metadata: formData.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create API key" }));
        setError(error.error || "Failed to create API key");
        return;
      }

      const result = await response.json();
      if (result.success) {
        setIsCreateDialogOpen(false);
        setFormData({
          name: "",
          scopes: [],
          expires_at: "",
          metadata: {},
        });
        loadApiKeys();
      } else {
        setError("Failed to create API key");
      }
    } catch {
      setError("An error occurred while creating API key");
    }
  };

  const handleUpdateApiKey = async () => {
    if (!editingApiKey) return;

    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    try {
      const response = await fetch(`/api/krapi/k1/apikeys/${editingApiKey.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          name: formData.name,
          scopes: formData.scopes,
          expires_at: formData.expires_at || undefined,
          is_active: editingApiKey.is_active,
          metadata: formData.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update API key" }));
        setError(error.error || "Failed to update API key");
        return;
      }

      const result = await response.json();
      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingApiKey(null);
        setFormData({
          name: "",
          scopes: [],
          expires_at: "",
          metadata: {},
        });
        loadApiKeys();
      } else {
        setError("Failed to update API key");
      }
    } catch {
      setError("An error occurred while updating API key");
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/krapi/k1/apikeys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete API key" }));
        setError(error.error || "Failed to delete API key");
        return;
      }

      const result = await response.json();
      if (result.success) {
        loadApiKeys();
      } else {
        setError("Failed to delete API key");
      }
    } catch {
      setError("An error occurred while deleting API key");
    }
  };

  const handleRegenerateApiKey = async (keyId: string) => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to regenerate this API key? The old key will be invalidated."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/krapi/k1/apikeys/${keyId}/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to regenerate API key" }));
        setError(error.error || "Failed to regenerate API key");
        return;
      }

      const result = await response.json();
      if (result.success) {
        loadApiKeys();
      } else {
        setError("Failed to regenerate API key");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while regenerating API key");
    }
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const copyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      // Error logged for debugging
    }
  };

  const openEditDialog = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey);
    setFormData({
      name: apiKey.name,
      scopes: apiKey.scopes,
      expires_at: apiKey.expires_at || "",
      metadata: apiKey.metadata || {},
    });
    setIsEditDialogOpen(true);
  };

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isExpiringSoon = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    return expiryDate <= thirtyDaysFromNow && expiryDate > now;
  };

  const filteredApiKeys = apiKeys.filter((key) => {
    const matchesSearch = key.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && key.is_active) ||
      (statusFilter === "inactive" && !key.is_active) ||
      (statusFilter === "expired" && isExpired(key.expires_at));
    return matchesSearch && matchesStatus;
  });

  const sortedApiKeys = [...filteredApiKeys].sort((a, b) => {
    let aValue: string | number, bValue: string | number;

    switch (sortBy) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "expires_at":
        aValue = a.expires_at ? new Date(a.expires_at).getTime() : 0;
        bValue = b.expires_at ? new Date(b.expires_at).getTime() : 0;
        break;
      default:
        const aVal = a[sortBy as keyof ApiKey];
        const bVal = b[sortBy as keyof ApiKey];
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
      <PageLayout className="cursor-progress" aria-busy>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={`api-keys-skeleton-item-${i}`} className="h-32 w-full" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="API Keys"
        description="Manage API keys for programmatic access to your project"
        action={
          <div className="flex items-center gap-2">
            <CodeSnippet context="api-keys" projectId={projectId} />
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <ActionButton variant="add" icon={Plus} data-testid="create-api-key-button">
                  Create API Key
                </ActionButton>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="create-api-key-dialog">
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key with specific permissions and expiry date
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">API Key Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Production API, Development API"
                  />
                </div>
                <div>
                  <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expires_at: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Permissions (Scopes)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(scopeLabels).map(([scope, label]) => (
                      <div key={scope} className="flex items-center space-x-2">
                        <Checkbox
                          id={scope}
                          checked={formData.scopes.includes(scope)}
                          onCheckedChange={() => toggleScope(scope)}
                        />
                        <Label htmlFor={scope} className="text-base font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <ActionButton
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="add"
                  onClick={handleCreateApiKey}
                  disabled={!formData.name}
                >
                  Create API Key
                </ActionButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="outline" icon={BookOpen}>
                  API Docs
                </ActionButton>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  API Keys Documentation
                </DialogTitle>
                <DialogDescription>
                  Code examples for integrating with KRAPI API Keys
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-3">TypeScript SDK</h3>
                  <div className="bg-muted p-4 ">
                    <pre className="text-base overflow-x-auto">
                      {`// Initialize KRAPI client (like Appwrite!)
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';

const krapi = new KrapiClient({
  endpoint: 'http://localhost:3470',
  apiKey: 'your-api-key'
});

// Get all API keys for a project
const apiKeys = await krapi.apiKeys.getAll(projectId);

// Create a new API key
const newApiKey = await krapi.apiKeys.create(projectId, {
  name: 'Production API Key',
  scopes: ['data:read', 'data:write', 'files:read'],
  expires_at: '2024-12-31T23:59:59Z', // Optional
  metadata: {
    environment: 'production',
    team: 'backend'
  }
});

// Get a specific API key
const apiKey = await krapi.apiKeys.get(projectId, keyId);

// Update an API key
const updated = await krapi.apiKeys.update(projectId, keyId, {
  name: 'Updated API Key',
  scopes: ['data:read', 'data:write'],
  is_active: true
});

// Regenerate an API key
const regenerated = await krapi.apiKeys.regenerate(projectId, keyId);

// Delete an API key
await krapi.apiKeys.delete(projectId, keyId);

// Using an API key for authentication
const clientWithKey = new KrapiClient({
  endpoint: 'http://localhost:3470',
  apiKey: 'your-generated-api-key'
});`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">
                    Python Requests
                  </h3>
                  <div className="bg-muted p-4 ">
                    <pre className="text-base overflow-x-auto">
                      {`import requests
import json
from datetime import datetime, timedelta

# Base configuration
BASE_URL = "http://localhost:3470"
API_KEY = "your-api-key"
PROJECT_ID = "your-project-id"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get all API keys
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys",
    headers=headers
)
api_keys = response.json()

# Create a new API key
api_key_data = {
    "name": "Production API Key",
    "scopes": ["data:read", "data:write", "files:read"],
    "expires_at": "2024-12-31T23:59:59Z",  # Optional
    "metadata": {
        "environment": "production",
        "team": "backend"
    }
}

response = requests.post(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys",
    headers=headers,
    json=api_key_data
)
new_api_key = response.json()

# Get a specific API key
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys/{key_id}",
    headers=headers
)
api_key = response.json()

# Update an API key
update_data = {
    "name": "Updated API Key",
    "scopes": ["data:read", "data:write"],
    "is_active": True
}

response = requests.put(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys/{key_id}",
    headers=headers,
    json=update_data
)

# Regenerate an API key
response = requests.post(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys/{key_id}/regenerate",
    headers=headers
)
regenerated_key = response.json()

# Delete an API key
response = requests.delete(
    f"{BASE_URL}/projects/{PROJECT_ID}/api-keys/{key_id}",
    headers=headers
)

# Using an API key for authentication
headers_with_key = {
    "Authorization": f"ApiKey your-generated-api-key",
    "Content-Type": "application/json"
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-3">
                    Available Scopes
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <h4 className="font-medium mb-2">Data Scopes:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? data:read - Read documents</li>
                        <li>? data:write - Create/update documents</li>
                        <li>? data:delete - Delete documents</li>
                        <li>? collections:read - Read collections</li>
                        <li>? collections:write - Manage collections</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">System Scopes:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>? files:read - Read files</li>
                        <li>? files:write - Upload files</li>
                        <li>? files:delete - Delete files</li>
                        <li>? users:read - Read users</li>
                        <li>? users:write - Manage users</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
      />

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
              <Label htmlFor="search">Search API Keys</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="expires_at">Expiry Date</SelectItem>
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

      {sortedApiKeys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API Keys Yet"
          description="Create your first API key to enable programmatic access"
          action={{
            label: "Create API Key",
            onClick: () => setIsCreateDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              API Keys ({sortedApiKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedApiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{apiKey.name}</div>
                          <div className="text-base text-muted-foreground">
                            Created by system
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-base bg-muted px-2 py-1 rounded">
                            {showApiKey === apiKey.id
                              ? apiKey.key || "N/A"
                              : apiKey.key
                                ? `${apiKey.key.substring(
                                    0,
                                    8
                                  )}...${apiKey.key.substring(
                                    apiKey.key.length - 4
                                  )}`
                                : "N/A"}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowApiKey(
                                showApiKey === apiKey.id ? null : apiKey.id
                              )
                            }
                          >
                            {showApiKey === apiKey.id ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (apiKey.key) {
                                copyApiKey(apiKey.key);
                              }
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {apiKey.is_active ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {isExpired(apiKey.expires_at) && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {isExpiringSoon(apiKey.expires_at) && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {apiKey.scopes.slice(0, 3).map((scope: string) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className="text-base"
                            >
                              {scopeLabels[scope as ProjectScope] || scope}
                            </Badge>
                          ))}
                          {apiKey.scopes.length > 3 && (
                            <Badge variant="outline" className="text-base">
                              +{apiKey.scopes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-base text-muted-foreground">
                          {apiKey.expires_at
                            ? new Date(apiKey.expires_at).toLocaleDateString()
                            : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-base text-muted-foreground">
                          {new Date(apiKey.created_at).toLocaleDateString()}
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
                              onClick={() => openEditDialog(apiKey)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRegenerateApiKey(apiKey.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Regenerate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteApiKey(apiKey.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Modify API key permissions and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">API Key Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Production API, Development API"
              />
            </div>
            <div>
              <Label htmlFor="edit-expires_at">Expiry Date (Optional)</Label>
              <Input
                id="edit-expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expires_at: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Permissions (Scopes)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(scopeLabels).map(([scope, label]) => (
                  <div key={scope} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${scope}`}
                      checked={formData.scopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <Label
                      htmlFor={`edit-${scope}`}
                      className="text-base font-normal"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <ActionButton
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="edit"
              onClick={handleUpdateApiKey}
              disabled={!formData.name}
            >
              Update API Key
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
