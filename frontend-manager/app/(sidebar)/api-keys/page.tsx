"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Trash2,
  KeyRound,
  Shield,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ApiKey, Scope } from "@/lib/krapi";

// Define all available scopes
const AVAILABLE_SCOPES = [
  {
    value: Scope.MASTER,
    label: "Master Access",
    description: "Full unrestricted access",
  },
  {
    value: Scope.ADMIN_READ,
    label: "Admin Read",
    description: "View admin users and system info",
  },
  {
    value: Scope.ADMIN_WRITE,
    label: "Admin Write",
    description: "Create/update admin users",
  },
  {
    value: Scope.ADMIN_DELETE,
    label: "Admin Delete",
    description: "Delete admin users",
  },
  {
    value: Scope.PROJECTS_READ,
    label: "Projects Read",
    description: "View projects",
  },
  {
    value: Scope.PROJECTS_WRITE,
    label: "Projects Write",
    description: "Create/update projects",
  },
  {
    value: Scope.PROJECTS_DELETE,
    label: "Projects Delete",
    description: "Delete projects",
  },
  {
    value: Scope.COLLECTIONS_READ,
    label: "Collections Read",
    description: "View data schemas",
  },
  {
    value: Scope.COLLECTIONS_WRITE,
    label: "Collections Write",
    description: "Create/update schemas",
  },
  {
    value: Scope.COLLECTIONS_DELETE,
    label: "Collections Delete",
    description: "Delete schemas",
  },
  {
    value: Scope.DOCUMENTS_READ,
    label: "Documents Read",
    description: "View data records",
  },
  {
    value: Scope.DOCUMENTS_WRITE,
    label: "Documents Write",
    description: "Create/update records",
  },
  {
    value: Scope.DOCUMENTS_DELETE,
    label: "Documents Delete",
    description: "Delete records",
  },
  {
    value: Scope.STORAGE_READ,
    label: "Storage Read",
    description: "View and download files",
  },
  {
    value: Scope.STORAGE_WRITE,
    label: "Storage Write",
    description: "Upload files",
  },
  {
    value: Scope.STORAGE_DELETE,
    label: "Storage Delete",
    description: "Delete files",
  },
];

export default function ApiKeysPage() {
  const { user, krapi, hasScope, scopes: userScopes } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myApiKeys, setMyApiKeys] = useState<ApiKey[]>([]);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    if (!krapi || !user) return;

    try {
      setLoading(true);
      // For now, we'll just show the current user's primary API key
      // The user object from the backend should contain the api_key property
      // but the SDK AdminUser type doesn't include it, so we'll handle this differently

      // Try to get the current user info which should include the API key
      const response = await krapi.auth.getCurrentUser();

      if (response.success && response.data) {
        // The backend AdminUser has api_key property, but SDK AdminUser doesn't
        // We'll need to handle this through the regenerate method or backend API
        // For now, we'll just show that no API key is loaded
        setCurrentApiKey(null);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!krapi) return;

    try {
      setRegenerating(true);
      const response = await krapi.auth.regenerateApiKey();

      if (response.success && response.data) {
        setCurrentApiKey(response.data.api_key);
        toast.success("API key regenerated successfully");

        // Show the new key in a dialog
        toast.custom(
          (t) => (
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  New API Key Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {response.data?.api_key || ""}
                </div>
                <p className="text-sm text-muted-foreground">
                  Save this key securely - it will not be shown again!
                </p>
                <Button
                  onClick={() => {
                    if (response.data?.api_key) {
                      navigator.clipboard.writeText(response.data.api_key);
                      toast.success("Copied to clipboard");
                    }
                    toast.dismiss(t);
                  }}
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy and Close
                </Button>
              </CardContent>
            </Card>
          ),
          { duration: Infinity }
        );
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys and access tokens
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Session
          </CardTitle>
          <CardDescription>
            Your current authentication status and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">User</p>
              <p className="text-muted-foreground">
                {user?.username} ({user?.role})
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Access Level</p>
              <Badge
                variant={
                  user?.role === "master_admin" ? "default" : "secondary"
                }
              >
                {user?.access_level}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Current Scopes</p>
            <div className="flex flex-wrap gap-2">
              {userScopes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scopes assigned
                </p>
              ) : userScopes.includes(Scope.MASTER) ? (
                <Badge variant="default">
                  <Shield className="mr-1 h-3 w-3" />
                  Master Access (All Scopes)
                </Badge>
              ) : (
                userScopes.map((scope) => (
                  <Badge key={scope} variant="outline">
                    {scope}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal API Key</TabsTrigger>
          {hasScope([Scope.ADMIN_READ, Scope.MASTER]) && (
            <TabsTrigger value="all">All API Keys</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your API Key</CardTitle>
              <CardDescription>
                Use this key to authenticate API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentApiKey ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                      {currentApiKey.substring(0, 10)}...
                      {currentApiKey.substring(currentApiKey.length - 4)}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(currentApiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-md">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm">
                      Keep your API key secure. Anyone with this key can access
                      your account.
                    </p>
                  </div>

                  <Button
                    onClick={regenerateApiKey}
                    disabled={regenerating}
                    variant="destructive"
                  >
                    {regenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate API Key
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <KeyRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No API key found for your account
                  </p>
                  <Button onClick={regenerateApiKey} disabled={regenerating}>
                    {regenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Generate API Key
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All API Keys</CardTitle>
              <CardDescription>
                Manage API keys for all users and projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                API key management interface coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
