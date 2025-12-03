/**
 * Admin Users Hook
 *
 * Custom hook for managing admin users page state and operations.
 *
 * @module components/admin-users/useAdminUsers
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import type { LocalAdminUser, AdminUserFormData } from "./types";

import { useReduxAuth } from "@/contexts/redux-auth-context";
import { AdminRole, AccessLevel, Scope } from "@/lib/krapi-constants";

/**
 * Admin Users Hook Return Type
 */
export interface UseAdminUsersReturn {
  // Auth
  sessionToken: string | null;
  hasScope: (scope: string) => boolean;
  isInitialized: boolean;

  // State
  adminUsers: LocalAdminUser[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Dialog state
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  selectedUser: LocalAdminUser | null;
  setSelectedUser: (user: LocalAdminUser | null) => void;

  // Actions
  loadUsers: () => Promise<void>;
  handleEditAdmin: (data: AdminUserFormData) => Promise<void>;
  handleDeleteAdmin: (userId: string) => Promise<void>;
  handleToggleStatus: (
    userId: string,
    newStatus: "active" | "inactive" | "suspended"
  ) => Promise<void>;

  // Computed
  filteredUsers: LocalAdminUser[];
}

/**
 * Custom hook for admin users page logic
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const { hasScope, sessionToken, isInitialized } = useReduxAuth();

  const [adminUsers, setAdminUsers] = useState<LocalAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LocalAdminUser | null>(null);

  /**
   * Load users from API
   */
  const loadUsers = useCallback(async () => {
    if (!isInitialized || !sessionToken) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/users?limit=100&offset=0", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to load users" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAdminUsers(result.data as unknown as LocalAdminUser[]);
      } else {
        setAdminUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, sessionToken]);

  /**
   * Handle editing an admin user
   */
  const handleEditAdmin = useCallback(
    async (data: AdminUserFormData) => {
      if (!selectedUser || !sessionToken) return;

      if (!hasScope(Scope.ADMIN_WRITE)) {
        toast.error("You don't have permission to update admin users");
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            username: data.firstName.toLowerCase() + data.lastName.toLowerCase(),
            role:
              data.role === "master_admin"
                ? AdminRole.MASTER_ADMIN
                : data.role === "admin"
                  ? AdminRole.ADMIN
                  : AdminRole.DEVELOPER,
            access_level:
              data.accessLevel === "full"
                ? AccessLevel.FULL
                : data.accessLevel === "read_write"
                  ? AccessLevel.READ_WRITE
                  : AccessLevel.READ_ONLY,
            permissions: Object.entries(data.permissions)
              .filter(([, value]) => value)
              .map(([key]) => key as string),
            active: selectedUser.status === "active",
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to update admin user" }));
          throw new Error(
            errorData.error || `Server returned ${response.status}`
          );
        }

        const result = await response.json();
        if (result.success) {
          loadUsers();
          setIsEditDialogOpen(false);
          setSelectedUser(null);
          toast.success("Admin user updated successfully");
        } else {
          throw new Error(result.error || "Failed to update admin user");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update admin user";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedUser, sessionToken, hasScope, loadUsers]
  );

  /**
   * Handle deleting an admin user
   */
  const handleDeleteAdmin = useCallback(
    async (userId: string) => {
      if (!sessionToken) return;

      if (!hasScope(Scope.ADMIN_DELETE)) {
        toast.error("You don't have permission to delete admin users");
        return;
      }

      if (confirm("Are you sure you want to delete this admin user?")) {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to delete admin user" }));
            throw new Error(
              errorData.error || `Server returned ${response.status}`
            );
          }

          const result = await response.json();
          if (result.success) {
            loadUsers();
            toast.success("Admin user deleted successfully");
          } else {
            throw new Error(result.error || "Failed to delete admin user");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to delete admin user";
          toast.error(errorMessage);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [sessionToken, hasScope, loadUsers]
  );

  /**
   * Handle toggling user status
   */
  const handleToggleStatus = useCallback(
    async (userId: string, newStatus: "active" | "inactive" | "suspended") => {
      if (!sessionToken) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: newStatus === "active",
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to update admin user status" }));
          throw new Error(
            errorData.error || `Server returned ${response.status}`
          );
        }

        const result = await response.json();
        if (result.success) {
          loadUsers();
          toast.success("Admin user status updated successfully");
        } else {
          throw new Error(result.error || "Failed to update admin user status");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update admin user status";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionToken, loadUsers]
  );

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users based on search query
  const filteredUsers = adminUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    sessionToken,
    hasScope,
    isInitialized,
    adminUsers,
    isLoading,
    error,
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
  };
}

export default useAdminUsers;

