import { useState, useCallback, useMemo } from "react";

import { useReduxAuth } from "@/contexts/redux-auth-context";
import { ExtendedAdminUser } from "@/lib/types/extended";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_token" && value) return value;
  }
  return localStorage.getItem("session_token");
}

export function useAdminUsers() {
  const { hasScope } = useReduxAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<ExtendedAdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedAdminUser | null>(null);

  const isLoading = loading;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/client/krapi/k1/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to load users" }));
        throw new Error(errorData.error || `Failed to load users: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAdminUsers(result.data as ExtendedAdminUser[]);
      } else {
        setAdminUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditAdmin = useCallback((user: ExtendedAdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteAdmin = useCallback(async (user: ExtendedAdminUser) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`/api/client/krapi/k1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete user" }));
        throw new Error(errorData.error || `Failed to delete user: ${response.status}`);
      }

      setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }, []);

  const handleToggleStatus = useCallback(async (user: ExtendedAdminUser) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`/api/client/krapi/k1/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !user.active }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to toggle user status" }));
        throw new Error(errorData.error || `Failed to toggle user status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === user.id ? (result.data as ExtendedAdminUser) : u))
        );
      } else {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle user status");
    }
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return adminUsers;
    const query = searchQuery.toLowerCase();
    return adminUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [adminUsers, searchQuery]);

  return {
    loading,
    isLoading,
    error,
    adminUsers,
    searchQuery,
    setSearchQuery,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedUser,
    setSelectedUser,
    loadUsers,
    handleEditAdmin,
    handleDeleteAdmin,
    handleToggleStatus,
    filteredUsers,
    hasScope,
    setLoading,
    setError,
  };
}
