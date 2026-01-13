"use client";

/**
 * API Keys Page
 * 
 * Manages API keys for a project using component-based architecture.
 * All components are always rendered - visibility controlled via CSS classes.
 */

import { KeyRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useCallback, useMemo, useEffect } from "react";

import { ApiKeyDialogs } from "./components/ApiKeyDialogs";
import { ApiKeyFilters } from "./components/ApiKeyFilters";
import { ApiKeysTable } from "./components/ApiKeysTable";
import { useApiKeys } from "./hooks/useApiKeys";
import type { ApiKey, ApiKeyFormData } from "./types";
import { getAuthToken, isExpired } from "./utils";

import {
  PageLayout,
  PageHeader,
  EmptyState,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysPage() {
  const params = useParams();
  const [_isMounted, setIsMounted] = useState(false);
  
  // Get projectId with fallback - all hooks must be called unconditionally
  const projectId = (params && params.projectId ? String(params.projectId) : null) || "";
  
  // All hooks must be called unconditionally - use empty string as fallback
  // But we'll prevent fetching in the hook itself if projectId is invalid
  const { apiKeys, isLoading, error, reload, setError } = useApiKeys(projectId || "");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [_newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const [formData, setFormData] = useState<ApiKeyFormData>({
    name: "",
    scopes: [],
    expires_at: "",
    metadata: {},
  });

  // Ensure we're on the client side before rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter and sort API keys - MUST be called before any early returns
  const filteredAndSortedKeys = useMemo(() => {
    // Return empty array if projectId is invalid to prevent errors
    if (!projectId || projectId === "" || projectId === "placeholder") {
      return [];
    }
    const filtered = apiKeys.filter((key) => {
      const matchesSearch = String(key.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && key.is_active) ||
        (statusFilter === "inactive" && !key.is_active) ||
        (statusFilter === "expired" && isExpired(key.expires_at));
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case "created_at":
          try {
            aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
            bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (isNaN(aValue)) aValue = 0;
            if (isNaN(bValue)) bValue = 0;
          } catch {
            aValue = 0;
            bValue = 0;
          }
          break;
        case "name":
          aValue = String(a.name || "").toLowerCase();
          bValue = String(b.name || "").toLowerCase();
          break;
        case "expires_at":
          try {
            aValue =
              a.expires_at && a.expires_at !== "null"
                ? new Date(a.expires_at).getTime()
                : 0;
            bValue =
              b.expires_at && b.expires_at !== "null"
                ? new Date(b.expires_at).getTime()
                : 0;
            if (isNaN(aValue)) aValue = 0;
            if (isNaN(bValue)) bValue = 0;
          } catch {
            aValue = 0;
            bValue = 0;
          }
          break;
        default:
          const aVal = a[sortBy as keyof ApiKey];
          const bVal = b[sortBy as keyof ApiKey];
          aValue =
            typeof aVal === "string" || typeof aVal === "number"
              ? aVal
              : String(aVal || "");
          bValue =
            typeof bVal === "string" || typeof bVal === "number"
              ? bVal
              : String(bVal || "");
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [apiKeys, searchQuery, statusFilter, sortBy, sortOrder, projectId]);

  const handleCreateApiKey = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/api-keys`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            scopes: formData.scopes,
            expires_at: formData.expires_at && formData.expires_at.length > 0 ? formData.expires_at : undefined,
            metadata: formData.metadata,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to create API key" }));
        const errorMsg = typeof errorData.error === "string"
          ? errorData.error
          : "Failed to create API key";
        setError(errorMsg);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setIsCreateDialogOpen(false);
        if (result.data && result.data.key) {
          setNewlyCreatedKey(result.data.key);
        }
        setFormData({
          name: "",
          scopes: [],
          expires_at: "",
          metadata: {},
        });
        reload();
      } else {
        setError("Failed to create API key");
      }
    } catch {
      setError("An error occurred while creating API key");
    }
  }, [projectId, formData, reload, setError]);

  const handleUpdateApiKey = useCallback(async () => {
    if (!editingApiKey) return;

    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    try {
      const response = await fetch(
        `/api/krapi/k1/apikeys/${editingApiKey.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            scopes: formData.scopes,
            expires_at: formData.expires_at ? formData.expires_at : undefined,
            is_active: editingApiKey.is_active,
            metadata: formData.metadata,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to update API key" }));
        const errorMsg = typeof errorData.error === "string"
          ? errorData.error
          : "Failed to update API key";
        setError(errorMsg);
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
        reload();
      } else {
        setError("Failed to update API key");
      }
    } catch {
      setError("An error occurred while updating API key");
    }
  }, [editingApiKey, formData, reload, setError]);

  const handleDeleteApiKey = useCallback(
    async (keyId: string) => {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      if (!confirm("Are you sure you want to delete this API key?")) {
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
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to delete API key" }));
          const errorMsg = typeof errorData.error === "string"
            ? errorData.error
            : "Failed to delete API key";
          setError(errorMsg);
          return;
        }

        reload();
      } catch {
        setError("An error occurred while deleting API key");
      }
    },
    [reload, setError]
  );

  const handleRegenerateApiKey = useCallback(
    async (keyId: string) => {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      if (
        !confirm(
          "Are you sure you want to regenerate this API key? The old key will no longer work."
        )
      ) {
        return;
      }

      try {
        const response = await fetch(
          `/api/krapi/k1/apikeys/${keyId}/regenerate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ project_id: projectId }),
          }
        );

        if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to regenerate API key" }));
          const errorMsg = typeof errorData.error === "string"
            ? errorData.error
            : "Failed to regenerate API key";
          setError(errorMsg);
          return;
        }

        reload();
      } catch {
        setError("An error occurred while regenerating API key");
      }
    },
    [projectId, reload, setError]
  );

  const openEditDialog = useCallback((apiKey: ApiKey) => {
    setEditingApiKey(apiKey);
    setFormData({
      name: String(apiKey.name || ""),
      scopes: Array.isArray(apiKey.scopes) ? apiKey.scopes.map(String) : [],
      expires_at:
        apiKey.expires_at && apiKey.expires_at !== "null"
          ? String(apiKey.expires_at)
          : "",
      metadata:
        apiKey.metadata &&
        typeof apiKey.metadata === "object" &&
        !Array.isArray(apiKey.metadata)
          ? (apiKey.metadata as Record<string, unknown>)
          : {},
    });
    setIsEditDialogOpen(true);
  }, []);

  const copyApiKey = useCallback((key: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(key).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = key;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
        } catch {
          // Ignore
        }
        document.body.removeChild(textArea);
      });
    }
  }, []);

  // Always render all components - use CSS to control visibility
  return (
    <PageLayout>
      {/* Loading State - Always rendered, hidden when not loading */}
      <div className={Boolean(isLoading) ? "" : "hidden"}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 mt-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-32 w-full" />
          ))}
        </div>
      </div>

      {/* Main Content - Always rendered, hidden when loading */}
      <div className={Boolean(isLoading) ? "hidden" : ""}>
        <PageHeader
          title="API Keys"
          description="Manage API keys for programmatic access to your project"
          showBackButton
          backButtonFallback={`/projects/${projectId}`}
          action={
            <ApiKeyDialogs
              projectId={projectId}
              isCreateDialogOpen={isCreateDialogOpen}
              isEditDialogOpen={isEditDialogOpen}
              formData={formData}
              onCreateDialogChange={setIsCreateDialogOpen}
              onEditDialogChange={setIsEditDialogOpen}
              onFormDataChange={(data) =>
                setFormData((prev) => ({ ...prev, ...data }))
              }
              onScopeToggle={(scope) =>
                setFormData((prev) => ({
                  ...prev,
                  scopes: prev.scopes.includes(scope)
                    ? prev.scopes.filter((s) => s !== scope)
                    : [...prev.scopes, scope],
                }))
              }
              onCreate={handleCreateApiKey}
              onUpdate={handleUpdateApiKey}
            />
          }
        />

        <ApiKeyFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortBy={sortBy}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onSortChange={setSortBy}
        />

        {/* Error Alert - Always rendered, hidden when no error */}
        <Alert
          variant="destructive"
          className={Boolean(error) ? "mt-4" : "mt-4 hidden"}
        >
          <AlertDescription>{String(error || "")}</AlertDescription>
        </Alert>

        {/* Content Card - Always rendered */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            {/* Empty State - Always rendered, hidden when there are keys */}
            <div className={filteredAndSortedKeys.length === 0 ? "" : "hidden"}>
              <EmptyState
                icon={KeyRound}
                title="No API Keys Yet"
                description="Create your first API key to enable programmatic access"
                action={{
                  label: "Create API Key",
                  onClick: () => setIsCreateDialogOpen(true),
                }}
              />
            </div>

            {/* Table - Always rendered, hidden when no keys */}
            <div className={filteredAndSortedKeys.length === 0 ? "hidden" : ""}>
              <ApiKeysTable
                apiKeys={filteredAndSortedKeys}
                showApiKey={showApiKey}
                onToggleShowKey={(keyId) =>
                  setShowApiKey(showApiKey === keyId ? null : keyId)
                }
                onCopyKey={copyApiKey}
                onEdit={openEditDialog}
                onRegenerate={handleRegenerateApiKey}
                onDelete={handleDeleteApiKey}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
