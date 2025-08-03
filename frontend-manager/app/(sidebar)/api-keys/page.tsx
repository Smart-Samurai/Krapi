"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KeyRound,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiKey, Scope } from "@/lib/krapi";

const AVAILABLE_SCOPES = [
  { value: Scope.MASTER, label: "Master (Full Access)", group: "Admin" },
  { value: Scope.ADMIN_READ, label: "Admin Read", group: "Admin" },
  { value: Scope.ADMIN_WRITE, label: "Admin Write", group: "Admin" },
  { value: Scope.ADMIN_DELETE, label: "Admin Delete", group: "Admin" },
  { value: Scope.PROJECTS_READ, label: "Projects Read", group: "Projects" },
  { value: Scope.PROJECTS_WRITE, label: "Projects Write", group: "Projects" },
  { value: Scope.PROJECTS_DELETE, label: "Projects Delete", group: "Projects" },
  { value: Scope.COLLECTIONS_READ, label: "Collections Read", group: "Collections" },
  { value: Scope.COLLECTIONS_WRITE, label: "Collections Write", group: "Collections" },
  { value: Scope.COLLECTIONS_DELETE, label: "Collections Delete", group: "Collections" },
  { value: Scope.DOCUMENTS_READ, label: "Documents Read", group: "Documents" },
  { value: Scope.DOCUMENTS_WRITE, label: "Documents Write", group: "Documents" },
  { value: Scope.DOCUMENTS_DELETE, label: "Documents Delete", group: "Documents" },
  { value: Scope.STORAGE_READ, label: "Storage Read", group: "Storage" },
  { value: Scope.STORAGE_WRITE, label: "Storage Write", group: "Storage" },
  { value: Scope.STORAGE_DELETE, label: "Storage Delete", group: "Storage" },
];

export default function ApiKeysPage() {
  const { krapi, user, hasScope, hasMasterAccess } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [keyType, setKeyType] = useState<"admin" | "project">("admin");
  const [expirationDate, setExpirationDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const loadApiKeys = async () => {
    if (!krapi) return;

    try {
      setLoading(true);
      // Note: This would need to be implemented in the SDK
      // For now, we'll show the current user's key info
      const userResponse = await krapi.auth.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        // Mock API key data based on current user
        const mockApiKeys: ApiKey[] = [
          {
            id: "current-user-key",
            key: "krap_" + "*".repeat(40), // Hidden by default
            name: "Personal API Key",
            type: "admin",
            owner_id: userResponse.data.id,
            scopes: user?.scopes || [],
            created_at: new Date().toISOString(),
            is_active: true,
          },
        ];
        setApiKeys(mockApiKeys);
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, [krapi]);

  const createApiKey = async () => {
    if (!krapi || !newKeyName.trim()) return;

    try {
      setCreating(true);
      
      // Note: SDK would need a createApiKey method
      // For now, we'll use the regenerate method as a placeholder
      const response = await krapi.auth.regenerateApiKey();
      
      if (response.success && response.data) {
        setNewApiKey(response.data.api_key);
        toast.success("API key created successfully!");
        setShowCreateDialog(false);
        resetForm();
        await loadApiKeys();
      } else {
        toast.error(response.error || "Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const regenerateApiKey = async (keyId: string) => {
    if (!krapi) return;

    try {
      const response = await krapi.auth.regenerateApiKey();
      if (response.success && response.data) {
        setNewApiKey(response.data.api_key);
        toast.success("API key regenerated successfully!");
        await loadApiKeys();
      } else {
        toast.error(response.error || "Failed to regenerate API key");
      }
    } catch (error) {
      console.error("Error regenerating API key:", error);
      toast.error("Failed to regenerate API key");
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!krapi) return;

    try {
      // Note: SDK would need a deleteApiKey method
      toast.success("API key deletion would be implemented here");
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
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

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const resetForm = () => {
    setNewKeyName("");
    setSelectedScopes([]);
    setKeyType("admin");
    setExpirationDate("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isKeyExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access
          </p>
        </div>
        {hasScope(Scope.ADMIN_WRITE) && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key with specific permissions and settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="keyType">Key Type</Label>
                  <Select value={keyType} onValueChange={(value: any) => setKeyType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select key type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin Key</SelectItem>
                      <SelectItem value="project">Project Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expiration">Expiration Date (Optional)</Label>
                  <Input
                    id="expiration"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label>Scopes</Label>
                  <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <div key={scope.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={scope.value}
                          checked={selectedScopes.includes(scope.value)}
                          onCheckedChange={() => toggleScope(scope.value)}
                        />
                        <Label htmlFor={scope.value} className="text-sm">
                          {scope.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createApiKey} disabled={creating || !newKeyName.trim()}>
                  {creating ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* New API Key Display */}
      {newApiKey && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>New API Key Created:</strong>
              <br />
              <code className="bg-muted px-2 py-1 rounded">{newApiKey}</code>
              <br />
              <span className="text-sm text-muted-foreground">
                Copy this key now. It won't be shown again.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newApiKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNewApiKey(null)}>
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Manage and monitor your active API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No API keys found</p>
              <p className="text-sm">Create your first API key to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {visibleKeys.has(apiKey.id) 
                            ? apiKey.key 
                            : `${apiKey.key.split('_')[0]}_${'*'.repeat(40)}`
                          }
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{apiKey.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {apiKey.is_active ? (
                        isKeyExpired(apiKey.expires_at) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(apiKey.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasScope(Scope.ADMIN_WRITE) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => regenerateApiKey(apiKey.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteApiKey(apiKey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API Key Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>Using Your API Keys</CardTitle>
          <CardDescription>
            How to authenticate your API requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication Header</h4>
            <code className="bg-muted p-2 rounded block text-sm">
              Authorization: ApiKey YOUR_API_KEY_HERE
            </code>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Example cURL Request</h4>
            <code className="bg-muted p-2 rounded block text-sm">
              curl -H "Authorization: ApiKey YOUR_API_KEY_HERE" \<br />
              &nbsp;&nbsp;&nbsp;&nbsp;{process.env.NEXT_PUBLIC_API_URL}/projects
            </code>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Best Practices:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Never expose API keys in client-side code</li>
                <li>Use environment variables for API keys</li>
                <li>Regularly rotate your API keys</li>
                <li>Use the principle of least privilege for scopes</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
