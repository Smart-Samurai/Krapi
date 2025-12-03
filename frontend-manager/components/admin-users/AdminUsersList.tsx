/**
 * Admin Users List Component
 *
 * Displays a list of admin users with actions.
 *
 * @module components/admin-users/AdminUsersList
 */
"use client";

import {
  Shield,
  Users,
  Plus,
  Database,
  Code,
  FileText,
  Lock,
  Settings,
  Globe,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react";
import React from "react";

import type { LocalAdminUser, AdminPermissions } from "./types";

import { IconButton } from "@/components/styled/IconButton";
import { Scope } from "@/lib/krapi-constants";

interface AdminUsersListProps {
  users: LocalAdminUser[];
  isLoading: boolean;
  hasScope: (scope: string) => boolean;
  onViewUser: (user: LocalAdminUser) => void;
  onEditUser: (user: LocalAdminUser) => void;
  onToggleStatus: (
    userId: string,
    newStatus: "active" | "inactive" | "suspended"
  ) => void;
  onDeleteUser: (userId: string) => void;
}

/**
 * Get role color class
 */
function getRoleColor(role: string): string {
  switch (role) {
    case "master_admin":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "project_admin":
      return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
    case "limited_admin":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
}

/**
 * Get status color class
 */
function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
    case "inactive":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    case "suspended":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
}

/**
 * Get permission icon
 */
function getPermissionIcon(permission: keyof AdminPermissions): React.ReactNode {
  switch (permission) {
    case "canManageUsers":
      return <Users className="h-4 w-4" />;
    case "canCreateProjects":
      return <Plus className="h-4 w-4" />;
    case "canManageDatabase":
      return <Database className="h-4 w-4" />;
    case "canManageAPI":
      return <Code className="h-4 w-4" />;
    case "canManageFiles":
      return <FileText className="h-4 w-4" />;
    case "canManageAuth":
      return <Lock className="h-4 w-4" />;
    case "canManageSystemSettings":
      return <Settings className="h-4 w-4" />;
    case "canAccessAllProjects":
      return <Globe className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
}

/**
 * Admin Users List Component
 *
 * Displays admin users in a list with actions.
 */
export function AdminUsersList({
  users,
  isLoading,
  hasScope,
  onViewUser,
  onEditUser,
  onToggleStatus,
  onDeleteUser,
}: AdminUsersListProps) {
  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-text/60">Loading admin users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-12 text-center">
        <Shield className="h-12 w-12 text-text/20 mx-auto mb-4" />
        <h3 className="text-base font-medium text-text mb-2">
          No Admin Users Found
        </h3>
        <p className="text-text/60 mb-4">
          No admin users were found in the database.
        </p>
        <p className="text-base text-text/40">
          Default login: admin@krapi.local / admin
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-secondary/50">
      {users.map((user) => (
        <div
          key={user.id}
          className="p-6 hover:bg-secondary/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-text">
                    {user.firstName} {user.lastName}
                  </h3>
                  <span
                    className={`px-2 py-1 text-base font-medium ${getRoleColor(
                      user.role
                    )}`}
                  >
                    {user.role.replace("_", " ")}
                  </span>
                  <span
                    className={`px-2 py-1 text-base font-medium ${getStatusColor(
                      user.status
                    )}`}
                  >
                    {user.status}
                  </span>
                </div>
                <p className="text-base text-text/60 mt-1">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2 text-base text-text/60">
                  <span>
                    Last active:{" "}
                    {new Date(user.lastActive).toLocaleDateString()}
                  </span>
                  <span>
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Permissions Summary */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(user.permissions)
                    .filter(
                      ([key, value]) =>
                        value === true && key !== "isMasterAdmin"
                    )
                    .slice(0, 6)
                    .map(([key]) => (
                      <div
                        key={key}
                        className="flex items-center space-x-1 text-base text-text/60"
                      >
                        {getPermissionIcon(key as keyof AdminPermissions)}
                        <span>
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  {Object.values(user.permissions).filter(Boolean).length >
                    6 && (
                    <span className="text-base text-text/40">
                      +
                      {Object.values(user.permissions).filter(Boolean).length -
                        6}{" "}
                      more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <IconButton
                icon={Eye}
                variant="secondary"
                size="sm"
                title="View Details"
                onClick={() => onViewUser(user)}
              />
              <IconButton
                icon={Edit}
                variant="secondary"
                size="sm"
                title={
                  !hasScope(Scope.ADMIN_WRITE)
                    ? "No permission to edit"
                    : "Edit User"
                }
                disabled={!hasScope(Scope.ADMIN_WRITE)}
                onClick={() => onEditUser(user)}
              />
              <IconButton
                icon={user.status === "active" ? UserX : UserCheck}
                variant="secondary"
                size="sm"
                title={
                  !hasScope(Scope.ADMIN_WRITE)
                    ? "No permission to change status"
                    : user.status === "active"
                      ? "Deactivate"
                      : "Activate"
                }
                disabled={!hasScope(Scope.ADMIN_WRITE)}
                onClick={() =>
                  onToggleStatus(
                    user.id,
                    user.status === "active" ? "inactive" : "active"
                  )
                }
              />
              {user.role !== "master_admin" && (
                <IconButton
                  icon={Trash2}
                  variant="secondary"
                  size="sm"
                  title={
                    !hasScope(Scope.ADMIN_DELETE)
                      ? "No permission to delete"
                      : "Delete User"
                  }
                  disabled={!hasScope(Scope.ADMIN_DELETE)}
                  onClick={() => onDeleteUser(user.id)}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminUsersList;

