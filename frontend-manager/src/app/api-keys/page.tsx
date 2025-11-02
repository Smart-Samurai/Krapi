"use client";

import {
  Plus,
  Search,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Shield,
  Clock,
  User,
  Database,
  Mail,
  FileText,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  project_id?: string;
  user_id?: string;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

const AVAILABLE_SCOPES = [
  { id: "master", name: "Master", description: "Full system access" },
  {
    id: "projects:read",
    name: "Projects Read",
    description: "Read project data",
  },
  {
    id: "projects:write",
    name: "Projects Write",
    description: "Create and modify projects",
  },
  {
    id: "projects:delete",
    name: "Projects Delete",
    description: "Delete projects",
  },
  {
    id: "collections:read",
    name: "Collections Read",
    description: "Read collection schemas",
  },
  {
    id: "collections:write",
    name: "Collections Write",
    description: "Create and modify collections",
  },
  {
    id: "collections:delete",
    name: "Collections Delete",
    description: "Delete collections",
  },
  {
    id: "documents:read",
    name: "Documents Read",
    description: "Read document data",
  },
  {
    id: "documents:write",
    name: "Documents Write",
    description: "Create and modify documents",
  },
  {
    id: "documents:delete",
    name: "Documents Delete",
    description: "Delete documents",
  },
  {
    id: "storage:read",
    name: "Storage Read",
    description: "Read file storage",
  },
  {
    id: "storage:write",
    name: "Storage Write",
    description: "Upload and modify files",
  },
  { id: "storage:delete", name: "Storage Delete", description: "Delete files" },
  { id: "email:send", name: "Email Send", description: "Send emails" },
  { id: "email:read", name: "Email Read", description: "Read email data" },
  { id: "admin:read", name: "Admin Read", description: "Read admin data" },
  {
    id: "admin:write",
    name: "Admin Write",
    description: "Modify admin settings",
  },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form state
  const [newKey, setNewKey] = useState({
    name: "",
    scopes: [] as string[],
    project_id: "",
    expires_at: "",
  });

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/krapi/k1/apikeys");
      if (!response.ok) throw new Error("Failed to fetch API keys");
      const data = await response.json();
      setApiKeys(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/krapi/k1/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch("/api/krapi/k1/apikeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKey),
      });
      if (!response.ok) throw new Error("Failed to create API key");
      await fetchApiKeys();
      setShowCreateKey(false);
      setNewKey({ name: "", scopes: [], project_id: "", expires_at: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    try {
      const response = await fetch(`/api/krapi/k1/apikeys/${keyId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete API key");
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const handleScopeChange = (scopeId: string, checked: boolean) => {
    const newScopes = checked
      ? [...newKey.scopes, scopeId]
      : newKey.scopes.filter((id) => id !== scopeId);
    setNewKey({ ...newKey, scopes: newScopes });
  };

  const getScopeInfo = (scopeId: string) => {
    return AVAILABLE_SCOPES.find((scope) => scope.id === scopeId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getDaysUntilExpiry = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchApiKeys(), fetchProjects()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredKeys = apiKeys.filter(
    (key) =>
      key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Key Management</h1>
          <p className="text-gray-600">
            Manage API keys and access permissions
          </p>
        </div>
        <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key with specific permissions and scope.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  value={newKey.name}
                  onChange={(e) =>
                    setNewKey({ ...newKey, name: e.target.value })
                  }
                  placeholder="Enter a descriptive name for this key"
                />
              </div>

              <div>
                <Label htmlFor="project">Project (Optional)</Label>
                <Select
                  value={newKey.project_id}
                  onValueChange={(value) =>
                    setNewKey({ ...newKey, project_id: value })
                  }
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

              <div>
                <Label htmlFor="expires-at">Expires At (Optional)</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={newKey.expires_at}
                  onChange={(e) =>
                    setNewKey({ ...newKey, expires_at: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto border rounded p-4">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.id}
                        checked={newKey.scopes.includes(scope.id)}
                        onCheckedChange={(checked) =>
                          handleScopeChange(scope.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={scope.id}
                          className="text-sm font-medium"
                        >
                          {scope.name}
                        </Label>
                        <p className="text-xs text-gray-600">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                Cancel
              </Button>
              <Button
                onClick={createApiKey}
                disabled={!newKey.name || newKey.scopes.length === 0}
              >
                Create API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search API keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredKeys.map((key) => (
          <Card key={key.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-lg">{key.name}</CardTitle>
                    <CardDescription>
                      Created: {formatDate(key.created_at)}
                      {key.last_used &&
                        ` • Last used: ${formatDate(key.last_used)}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={key.is_active ? "default" : "secondary"}>
                    {key.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {isExpired(key.expires_at) && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                  {key.expires_at && !isExpired(key.expires_at) && (
                    <Badge variant="outline">
                      Expires in {getDaysUntilExpiry(key.expires_at)} days
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">API Key</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={
                        visibleKeys.has(key.id) ? key.key : "••••••••••••••••"
                      }
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {key.scopes.map((scope) => {
                      const scopeInfo = getScopeInfo(scope);
                      return (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="text-xs"
                        >
                          {scopeInfo?.name || scope}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {key.project_id && (
                  <div>
                    <Label className="text-sm font-medium">Project</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {projects.find((p) => p.id === key.project_id)?.name ||
                        key.project_id}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeyDetails(key)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteApiKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredKeys.length === 0 && (
        <div className="text-center py-12">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No API keys found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "No API keys match your search."
              : "Create your first API key to get started."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateKey(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          )}
        </div>
      )}

      {/* Key Details Dialog */}
      <Dialog
        open={!!showKeyDetails}
        onOpenChange={() => setShowKeyDetails(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Details</DialogTitle>
            <DialogDescription>
              Detailed information about this API key.
            </DialogDescription>
          </DialogHeader>
          {showKeyDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {showKeyDetails.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    <Badge
                      variant={
                        showKeyDetails.is_active ? "default" : "secondary"
                      }
                    >
                      {showKeyDetails.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(showKeyDetails.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Used</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {showKeyDetails.last_used
                      ? formatDate(showKeyDetails.last_used)
                      : "Never"}
                  </p>
                </div>
                {showKeyDetails.expires_at && (
                  <div>
                    <Label className="text-sm font-medium">Expires</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(showKeyDetails.expires_at)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">API Key</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={showKeyDetails.key}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(showKeyDetails.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="space-y-2 mt-1">
                  {showKeyDetails.scopes.map((scope) => {
                    const scopeInfo = getScopeInfo(scope);
                    return (
                      <div
                        key={scope}
                        className="flex items-center space-x-2 p-2 border rounded"
                      >
                        <Shield className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {scopeInfo?.name || scope}
                          </p>
                          <p className="text-xs text-gray-600">
                            {scopeInfo?.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

