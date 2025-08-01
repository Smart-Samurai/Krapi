"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { FiPlus, FiKey, FiTrash2, FiCopy, FiEye, FiEyeOff } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  scopes: string[];
  active: boolean;
}

export default function ProjectApiKeysPage() {
  const params = useParams();
  const krapi = useKrapi();
  const projectId = params.projectId as string;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (krapi && projectId) {
      fetchApiKeys();
    }
  }, [krapi, projectId]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call when endpoint is implemented
      // const response = await krapi.projects.getApiKeys(projectId);
      
      // Mock data for now
      const mockKeys: ApiKey[] = [
        {
          id: "1",
          name: "Production API Key",
          key: "pk_live_1234567890abcdef",
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_used: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          scopes: ["collections:read", "documents:read", "documents:write"],
          active: true,
        },
        {
          id: "2",
          name: "Development API Key",
          key: "pk_test_abcdef1234567890",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_used: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          scopes: ["collections:*", "documents:*", "storage:*"],
          active: true,
        },
        {
          id: "3",
          name: "Mobile App Key",
          key: "pk_mobile_fedcba0987654321",
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          scopes: ["documents:read", "storage:read"],
          active: false,
        },
      ];
      
      setApiKeys(mockKeys);
    } catch (err) {
      console.error("Error fetching API keys:", err);
      setError("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName) return;

    try {
      // TODO: Implement actual API key creation
      console.log("Creating API key:", newKeyName);
      setIsCreateDialogOpen(false);
      setNewKeyName("");
      fetchApiKeys();
    } catch (err) {
      console.error("Error creating API key:", err);
      setError("Failed to create API key");
    }
  };

  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"?`)) {
      return;
    }

    try {
      // TODO: Implement actual API key deletion
      console.log("Deleting API key:", keyId);
      fetchApiKeys();
    } catch (err) {
      console.error("Error deleting API key:", err);
      setError("Failed to delete API key");
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const maskApiKey = (key: string) => {
    const prefix = key.substring(0, 7);
    const suffix = key.substring(key.length - 4);
    return `${prefix}...${suffix}`;
  };

  if (!krapi) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">API Keys</h1>
            <p className="text-text/60 mt-2">
              Manage API keys for accessing your project
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <FiPlus className="mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* API Keys List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-text/60">Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FiKey className="w-12 h-12 text-text/30 mb-4" />
              <h3 className="text-lg font-semibold text-text mb-2">
                No API keys yet
              </h3>
              <p className="text-text/60 text-center mb-4">
                Create your first API key to start using the API
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <FiPlus className="mr-2" />
                Create First API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FiKey className="w-5 h-5" />
                        {apiKey.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
                        {apiKey.last_used && (
                          <span className="ml-2">
                            • Last used {formatDistanceToNow(new Date(apiKey.last_used), { addSuffix: true })}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={apiKey.active ? "default" : "secondary"}>
                        {apiKey.active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-text/60">API Key</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={showKeys[apiKey.id] ? apiKey.key : maskApiKey(apiKey.key)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {showKeys[apiKey.id] ? (
                          <FiEyeOff className="w-4 h-4" />
                        ) : (
                          <FiEye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                      >
                        <FiCopy className="w-4 h-4" />
                      </Button>
                      {copiedKey === apiKey.id && (
                        <span className="text-sm text-green-600">Copied!</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-text/60">Permissions</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {apiKey.scopes.map((scope) => (
                        <Badge key={scope} variant="outline">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create API Key Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                API keys allow you to authenticate requests to your project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Server, Mobile App"
                />
                <p className="text-xs text-text/60 mt-1">
                  A descriptive name to help you identify this key
                </p>
              </div>
              <div>
                <Label>Permissions</Label>
                <p className="text-sm text-text/60 mt-1">
                  Select the permissions for this API key
                </p>
                {/* TODO: Add permission selection UI */}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateApiKey} disabled={!newKeyName}>
                Create API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}