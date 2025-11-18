/**
 * Admin Users Page
 * 
 * Page for managing admin users with role and permission configuration.
 * Provides admin user CRUD operations and access level management.
 * 
 * @module app/(sidebar)/users/page
 * @example
 * // Automatically rendered at /users route
 */
"use client";

import {
  Plus,
  Users,
  Edit,
  Trash2,
  Eye,
  Search,
  Shield,
  UserCheck,
  UserX,
  Settings,
  Lock,
  Database,
  Code,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  PageLayout,
  PageHeader,
  ActionButton,
} from "@/components/common";
import { Form, FormField } from "@/components/forms";
import { IconButton } from "@/components/styled/IconButton";
import { InfoBlock } from "@/components/styled/InfoBlock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StreamlinedUserDialog } from "@/components/users/StreamlinedUserDialog";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { AdminUser } from "@/lib/krapi";
import { AdminRole, AccessLevel, Scope } from "@/lib/krapi-constants";
import { ExtendedAdminUser } from "@/lib/types/extended";

// Permission types
interface AdminPermissions {
  // System-wide permissions
  canManageUsers: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canManageSystemSettings: boolean;
  canViewSystemLogs: boolean;
  canManageBackups: boolean;

  // Project-specific permissions
  canAccessAllProjects: boolean;
  restrictedProjectIds: string[];

  // Feature-specific permissions
  canManageDatabase: boolean;
  canManageAPI: boolean;
  canManageFiles: boolean;

  canManageAuth: boolean;

  // Administrative permissions
  canCreateAdminAccounts: boolean;
  canModifyOtherAdmins: boolean;
  isMasterAdmin: boolean;
}

/**
 * Local Admin User Interface
 * 
 * @interface LocalAdminUser
 * @property {string} id - User ID
 * @property {string} email - Email address
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {"master_admin" | "admin" | "project_admin" | "limited_admin"} role - User role
 * @property {"active" | "inactive" | "suspended"} status - User status
 * @property {AdminPermissions} permissions - User permissions
 * @property {string} lastActive - Last active timestamp
 * @property {string} createdAt - Creation timestamp
 * @property {string} [lastLogin] - Last login timestamp
 */
interface LocalAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "master_admin" | "admin" | "project_admin" | "limited_admin";
  status: "active" | "inactive" | "suspended";
  permissions: AdminPermissions;
  lastActive: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Admin User Schema
 * 
 * @constant {z.ZodObject}
 */
const adminUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["master_admin", "admin", "project_admin", "limited_admin"]),
    accessLevel: z.enum(["full", "read_write", "read_only"]),
    permissions: z.object({
      canManageUsers: z.boolean(),
      canCreateProjects: z.boolean(),
      canDeleteProjects: z.boolean(),
      canManageSystemSettings: z.boolean(),
      canViewSystemLogs: z.boolean(),
      canManageBackups: z.boolean(),
      canAccessAllProjects: z.boolean(),
      canManageDatabase: z.boolean(),
      canManageAPI: z.boolean(),
      canManageFiles: z.boolean(),

      canManageAuth: z.boolean(),
      canCreateAdminAccounts: z.boolean(),
      canModifyOtherAdmins: z.boolean(),
      isMasterAdmin: z.boolean(),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AdminUserFormData = z.infer<typeof adminUserSchema>;

export default function ServerAdministrationPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LocalAdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const krapi = useKrapi();
  const { hasScope } = useReduxAuth();

  const [adminUsers, setAdminUsers] = useState<LocalAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!krapi) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await krapi.admin.getAllUsers({
        limit: 100,
        offset: 0,
      });
      const result = response as unknown as { data?: AdminUser[] };
      if (result && result.data) {
        setAdminUsers(result.data as unknown as LocalAdminUser[]);
      } else {
        setAdminUsers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [krapi]);

  // Fetch admin users from the database
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!krapi) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading KRAPI SDK...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button className="btn-confirm mt-4" onClick={loadUsers}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleEditAdmin = async (data: AdminUserFormData) => {
    if (!selectedUser) return;

    if (!hasScope(Scope.ADMIN_WRITE)) {
      toast.error("You don't have permission to update admin users");
      return;
    }

    try {
      setIsLoading(true);
      const response = await krapi.admin.updateUser(selectedUser.id, {
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
          .filter(([_, value]) => value)
          .map(([key]) => key as string) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        active: selectedUser.status === "active",
      });
      const result = response as unknown as { success: boolean; error?: string };

      if (result.success) {
        // Refresh the admin users list
        loadUsers();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      }
    } catch {
      // Error logged for debugging
      alert("Failed to update admin user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (!hasScope(Scope.ADMIN_DELETE)) {
      toast.error("You don't have permission to delete admin users");
      return;
    }

    if (confirm("Are you sure you want to delete this admin user?")) {
      try {
        setIsLoading(true);
        const response = await krapi.admin.deleteUser(userId);
        const result = response as unknown as { success: boolean; error?: string };

        if (result.success) {
          // Remove the user from the local state
          loadUsers();
        }
      } catch {
        // Error logged for debugging
        alert("Failed to delete admin user");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleStatus = async (
    userId: string,
    newStatus: "active" | "inactive" | "suspended"
  ) => {
    try {
      setIsLoading(true);
      const response = await krapi.admin.updateUser(userId, {
        active: newStatus === "active",
      });
      const result = response as unknown as { success: boolean; error?: string };

      if (result.success) {
        // Update the local state
        loadUsers();
      }
    } catch {
      // Error logged for debugging
      alert("Failed to update admin user status");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = adminUsers.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
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
  };

  const getStatusColor = (status: string) => {
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
  };

  const getPermissionIcon = (permission: keyof AdminPermissions) => {
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
  };

  return (
    <PageLayout>
      <PageHeader
        title="Server Administration"
        description="Manage administrative users and their access rights"
        action={
          <ActionButton
            variant="add"
            icon={Plus}
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!hasScope(Scope.ADMIN_WRITE)}
          >
            Add Admin User
          </ActionButton>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary  p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-text/60">Total Admins</p>
              <p className="text-base font-bold text-text mt-1">
                {isLoading ? "..." : adminUsers.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 ">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary  p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-text/60">Active Admins</p>
              <p className="text-base font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 dark:bg-primary/20 ">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary  p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-text/60">Master Admins</p>
              <p className="text-base font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.role === "master_admin").length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 ">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary  p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-text/60">
                Inactive/Suspended
              </p>
              <p className="text-base font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.status !== "active").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 ">
              <UserX className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search admin users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary  bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Admin Users List */}
      <div className="bg-background border border-secondary ">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-base font-semibold text-text">
            Administrative Users
          </h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin  h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-text/60">Loading admin users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
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
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-6 hover:bg-secondary/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10  flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-text">
                          {user.firstName} {user.lastName}
                        </h3>
                        <span
                          className={`px-2 py-1 text-base font-medium  ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2 py-1 text-base font-medium  ${getStatusColor(
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
                          Created:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
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
                          .map(([key, _value]) => (
                            <div
                              key={key}
                              className="flex items-center space-x-1 text-base text-text/60"
                            >
                              {getPermissionIcon(key as keyof AdminPermissions)}
                              <span>
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (_str) => _str.toUpperCase())}
                              </span>
                            </div>
                          ))}
                        {Object.values(user.permissions).filter(Boolean)
                          .length > 6 && (
                          <span className="text-base text-text/40">
                            +
                            {Object.values(user.permissions).filter(Boolean)
                              .length - 6}{" "}
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
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditDialogOpen(true);
                      }}
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
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditDialogOpen(true);
                      }}
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
                        handleToggleStatus(
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
                        onClick={() => handleDeleteAdmin(user.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Modify administrative user permissions and settings
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Form
              schema={adminUserSchema}
              onSubmit={handleEditAdmin}
              defaultValues={{
                email: selectedUser.email,
                firstName: selectedUser.firstName,
                lastName: selectedUser.lastName,
                role: selectedUser.role,
                accessLevel: "full", // Default access level
                permissions: selectedUser.permissions,
                password: "",
                confirmPassword: "",
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="firstName"
                  label="First Name"
                  type="text"
                  placeholder="Enter first name"
                  required
                />
                <FormField
                  name="lastName"
                  label="Last Name"
                  type="text"
                  placeholder="Enter last name"
                  required
                />
              </div>
              <FormField
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="password"
                  label="New Password (leave blank to keep current)"
                  type="password"
                  placeholder="Enter new password"
                />
                <FormField
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
              <FormField
                name="role"
                label="Role"
                type="select"
                required
                options={[
                  { value: "master_admin", label: "Master Administrator" },
                  { value: "admin", label: "System Administrator" },
                  { value: "project_admin", label: "Project Administrator" },
                  { value: "limited_admin", label: "Limited Administrator" },
                ]}
              />
              <FormField
                name="accessLevel"
                label="Access Level"
                type="select"
                required
                options={[
                  { value: "full", label: "Full Access" },
                  { value: "read_write", label: "Read & Write" },
                  { value: "read_only", label: "Read Only" },
                ]}
              />

              {/* Permissions Section */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold">Permissions</h3>

                {/* System Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-text/80">
                    System Permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      name="permissions.canManageUsers"
                      label="Manage Users"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canCreateProjects"
                      label="Create Projects"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canDeleteProjects"
                      label="Delete Projects"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageSystemSettings"
                      label="System Settings"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canViewSystemLogs"
                      label="View System Logs"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageBackups"
                      label="Manage Backups"
                      type="checkbox"
                    />
                  </div>
                </div>

                {/* Feature Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-text/80">
                    Feature Permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      name="permissions.canAccessAllProjects"
                      label="Access All Projects"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageDatabase"
                      label="Manage Database"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageAPI"
                      label="Manage API"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageFiles"
                      label="Manage Files"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageEmail"
                      label="Manage Email"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canManageAuth"
                      label="Manage Authentication"
                      type="checkbox"
                    />
                  </div>
                </div>

                {/* Administrative Permissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-text/80">
                    Administrative Permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      name="permissions.canCreateAdminAccounts"
                      label="Create Admin Accounts"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.canModifyOtherAdmins"
                      label="Modify Other Admins"
                      type="checkbox"
                    />
                    <FormField
                      name="permissions.isMasterAdmin"
                      label="Master Administrator"
                      type="checkbox"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <ActionButton
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </ActionButton>
                <ActionButton variant="edit">
                  Update Admin User
                </ActionButton>
              </DialogFooter>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Info Block */}
      <InfoBlock
        title="Server Administration"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-base space-y-2">
          <p>
            Server Administration allows you to manage administrative users with
            granular permissions.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Master Administrator:</strong> Full system access, can
              manage all other admins
            </li>
            <li>
              <strong>System Administrator:</strong> Full system access, limited
              admin management
            </li>
            <li>
              <strong>Project Administrator:</strong> Project-focused
              permissions with some system access
            </li>
            <li>
              <strong>Limited Administrator:</strong> Restricted permissions for
              specific tasks
            </li>
          </ul>
          <p className="mt-3">
            <strong>Default Login:</strong> admin@krapi.local / admin
          </p>
          <p className="mt-1">
            <strong>Note:</strong> Only Master Administrators can create new
            admin accounts and modify other admin permissions.
          </p>
        </div>
      </InfoBlock>

      {/* Streamlined User Dialog */}
      <StreamlinedUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          loadUsers();
          toast.success("Admin user created successfully");
        }}
      />

      {/* Edit Dialog */}
      <StreamlinedUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editUser={
          selectedUser
            ? ({
                id: selectedUser.id,
                email: selectedUser.email,
                username: `${selectedUser.firstName} ${selectedUser.lastName}`,
                role: selectedUser.role as AdminRole,
                access_level: "full" as AccessLevel,
                permissions: [],
                active: selectedUser.status === "active",
                created_at: selectedUser.createdAt,
                updated_at: selectedUser.lastActive,
                last_login: selectedUser.lastLogin,
              } as ExtendedAdminUser)
            : undefined
        }
        onSuccess={() => {
          loadUsers();
          toast.success("Admin user updated successfully");
        }}
      />
    </PageLayout>
  );
}
