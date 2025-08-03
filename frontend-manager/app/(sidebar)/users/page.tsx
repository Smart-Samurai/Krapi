"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  Eye,
  Search,
  Mail,
  Shield,
  UserCheck,
  UserX,
  MoreVertical,
  Settings,
  Lock,
  Unlock,
  Database,
  Code,
  FileText,
  Globe,
} from "lucide-react";
import { InfoBlock } from "@/components/styled/InfoBlock";
import { IconButton } from "@/components/styled/IconButton";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { AdminUser as AdminUserType } from "@/lib/krapi";
import { AdminRole, AccessLevel, Scope } from "@/lib/krapi";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { StreamlinedUserDialog } from "@/components/users/StreamlinedUserDialog";
import { DatabaseAdminUser, ExtendedAdminUser } from "@/lib/types/extended";

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
  const { hasScope } = useAuth();

  const [adminUsers, setAdminUsers] = useState<LocalAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch admin users from the database
  useEffect(() => {
    const fetchAdminUsers = async () => {
      if (!krapi) return;

      try {
        setIsLoading(true);
        const response = await krapi.admin.getUsers({});

        if (response.success && response.data) {
          // Transform the database users to match our AdminUser interface
          const transformedUsers: LocalAdminUser[] = response.data.map((user: any) => ({
            id: user.id.toString(),
            email: user.email,
            firstName: user.username?.split(" ")[0] || "",
            lastName: user.username?.split(" ")[1] || "",
            role: user.role as
              | "master_admin"
              | "admin"
              | "project_admin"
              | "limited_admin",
            status: user.active ? "active" : "inactive",
            permissions: {
              canManageUsers:
                user.permissions?.some(
                  (p: any) =>
                    p === "users.create" ||
                    p === "users.update" ||
                    p === "users.delete"
                ) || false,
              canCreateProjects:
                user.permissions?.some((p: any) => p === "projects.create") || false,
              canDeleteProjects:
                user.permissions?.some((p: any) => p === "projects.delete") || false,
              canManageSystemSettings:
                user.permissions?.some((p: any) => p === "settings.update") || false,
              canViewSystemLogs: false, // Not available in current permission system
              canManageBackups: false, // Not available in current permission system
              canAccessAllProjects:
                user.permissions?.some((p: any) => p === "projects.read") || false,
              restrictedProjectIds: [],
              canManageDatabase:
                user.permissions?.some(
                  (p: any) =>
                    p === "collections.create" ||
                    p === "collections.write" ||
                    p === "collections.delete"
                ) || false,
              canManageAPI: false, // Not available in current permission system
              canManageFiles:
                user.permissions?.some(
                  (p: any) => p === "storage.upload" || p === "storage.delete"
                ) || false,
              canManageAuth: false, // Not available in current permission system
              canCreateAdminAccounts: false, // Not available in current permission system
              canModifyOtherAdmins: false, // Not available in current permission system
              isMasterAdmin: user.role === "master_admin",
            },
            lastActive: user.last_login || user.updated_at,
            createdAt: user.created_at,
            lastLogin: user.last_login || "",
          }));
          setAdminUsers(transformedUsers);
        } else {
          console.error("Failed to fetch admin users:", response.error);
          setAdminUsers([]);
        }
      } catch (error) {
        console.error("Failed to fetch admin users:", error);
        setAdminUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminUsers();
  }, [krapi]);

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
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
        role: data.role as any,
        access_level: data.accessLevel as any,
        permissions: Object.entries(data.permissions)
          .filter(([_, value]) => value)
          .map(([key]) => key as any),
        active: selectedUser.status === "active",
      });

      if (response.success) {
        // Refresh the admin users list
        const usersResponse = await krapi.admin.getUsers();
        if (usersResponse.success && usersResponse.data) {
          setAdminUsers(
            usersResponse.data.map((user: any) => ({
              id: user.id,
              firstName: user.username.split(" ")[0] || user.username,
              lastName: user.username.split(" ")[1] || "",
              email: user.email,
              role: user.role,
              accessLevel: user.access_level,
              status: user.active ? "active" : "inactive",
              permissions: user.permissions.reduce((acc: any, perm: string) => {
                acc[perm] = true;
                return acc;
              }, {}),
              lastLogin: user.last_login || new Date().toISOString(),
              lastActive:
                user.last_login || user.updated_at || new Date().toISOString(),
              createdAt: user.created_at,
            }))
          );
        }
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Error updating admin user:", error);
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

        if (response.success) {
          // Remove the user from the local state
          setAdminUsers(adminUsers.filter((user) => user.id !== userId));
        }
      } catch (error) {
        console.error("Error deleting admin user:", error);
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

      if (response.success) {
        // Update the local state
        setAdminUsers(
          adminUsers.map((user) =>
            user.id === userId ? { ...user, status: newStatus } : user
          )
        );
      }
    } catch (error) {
      console.error("Error updating admin user status:", error);
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
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "limited_admin":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">
            Server Administration
          </h1>
          <p className="text-text/60 mt-1">
            Manage administrative users and their access rights
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={!hasScope(Scope.ADMIN_WRITE)}
          title={
            !hasScope(Scope.ADMIN_WRITE)
              ? "You don't have permission to create admin users"
              : undefined
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Admin User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Admins</p>
              <p className="text-2xl font-bold text-text mt-1">
                {isLoading ? "..." : adminUsers.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Active Admins</p>
              <p className="text-2xl font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Master Admins</p>
              <p className="text-2xl font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.role === "master_admin").length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Inactive/Suspended
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {isLoading
                  ? "..."
                  : adminUsers.filter((u) => u.status !== "active").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
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
            className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Admin Users List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">
            Administrative Users
          </h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text/60">Loading admin users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-text/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text mb-2">
                No Admin Users Found
              </h3>
              <p className="text-text/60 mb-4">
                No admin users were found in the database.
              </p>
              <p className="text-sm text-text/40">
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
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-text">
                          {user.firstName} {user.lastName}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-text/60 mt-1">{user.email}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
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
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center space-x-1 text-xs text-text/60"
                            >
                              {getPermissionIcon(key as keyof AdminPermissions)}
                              <span>
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (str) => str.toUpperCase())}
                              </span>
                            </div>
                          ))}
                        {Object.values(user.permissions).filter(Boolean)
                          .length > 6 && (
                          <span className="text-xs text-text/40">
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
                <h3 className="text-lg font-semibold">Permissions</h3>

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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Update Admin User
                </Button>
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
        <div className="text-sm space-y-2">
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
          const fetchAdminUsers = async () => {
            if (!krapi) return;

            try {
              setIsLoading(true);
              const response = await krapi.admin.getUsers({});

              if (response.success && response.data) {
                // Transform the database users to match our AdminUser interface
                const transformedUsers: LocalAdminUser[] = response.data.map((user: any) => ({
                  id: user.id.toString(),
                  email: user.email,
                  firstName: user.username?.split(" ")[0] || "",
                  lastName: user.username?.split(" ")[1] || "",
                  role: user.role as
                    | "master_admin"
                    | "admin"
                    | "project_admin"
                    | "limited_admin",
                  status: user.active ? "active" : "inactive",
                  permissions: {
                    canManageUsers:
                      user.permissions?.some(
                        (p: any) =>
                          p === "users.create" ||
                          p === "users.update" ||
                          p === "users.delete"
                      ) || false,
                    canCreateProjects:
                      user.permissions?.some((p: any) => p === "projects.create") || false,
                    canDeleteProjects:
                      user.permissions?.some((p: any) => p === "projects.delete") || false,
                    canManageSystemSettings:
                      user.permissions?.some((p: any) => p === "settings.update") || false,
                    canViewSystemLogs: false, // Not available in current permission system
                    canManageBackups: false, // Not available in current permission system
                    canAccessAllProjects:
                      user.permissions?.some((p: any) => p === "projects.read") || false,
                    restrictedProjectIds: [],
                    canManageDatabase:
                      user.permissions?.some(
                        (p: any) =>
                          p === "collections.create" ||
                          p === "collections.write" ||
                          p === "collections.delete"
                      ) || false,
                    canManageAPI: false, // Not available in current permission system
                    canManageFiles:
                      user.permissions?.some(
                        (p: any) => p === "storage.upload" || p === "storage.delete"
                      ) || false,
                    canManageAuth: false, // Not available in current permission system
                    canCreateAdminAccounts: false, // Not available in current permission system
                    canModifyOtherAdmins: false, // Not available in current permission system
                    isMasterAdmin: user.role === "master_admin",
                  },
                  lastActive: user.last_login || user.updated_at,
                  createdAt: user.created_at,
                  lastLogin: user.last_login || "",
                }));
                setAdminUsers(transformedUsers);
              } else {
                console.error("Failed to fetch admin users:", response.error);
                setAdminUsers([]);
              }
            } catch (error) {
              console.error("Error fetching admin users:", error);
              setAdminUsers([]);
            } finally {
              setIsLoading(false);
            }
          };
          fetchAdminUsers();
          toast.success("Admin user created successfully");
        }}
      />

      {/* Edit Dialog */}
      <StreamlinedUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editUser={selectedUser ? {
          id: selectedUser.id,
          email: selectedUser.email,
          username: `${selectedUser.firstName} ${selectedUser.lastName}`,
          role: selectedUser.role as AdminRole,
          access_level: 'full' as AccessLevel,
          permissions: [],
          active: selectedUser.status === 'active',
          created_at: selectedUser.createdAt,
          updated_at: selectedUser.lastActive,
          last_login: selectedUser.lastLogin,
        } as ExtendedAdminUser : undefined}
        onSuccess={() => {
          const fetchAdminUsers = async () => {
            if (!krapi) return;

            try {
              setIsLoading(true);
              const response = await krapi.admin.getUsers({});

              if (response.success && response.data) {
                // Transform the database users to match our AdminUser interface
                const transformedUsers: LocalAdminUser[] = response.data.map((user: any) => ({
                  id: user.id.toString(),
                  email: user.email,
                  firstName: user.username?.split(" ")[0] || "",
                  lastName: user.username?.split(" ")[1] || "",
                  role: user.role as
                    | "master_admin"
                    | "admin"
                    | "project_admin"
                    | "limited_admin",
                  status: user.active ? "active" : "inactive",
                  permissions: {
                    canManageUsers:
                      user.permissions?.some(
                        (p: any) =>
                          p === "users.create" ||
                          p === "users.update" ||
                          p === "users.delete"
                      ) || false,
                    canCreateProjects:
                      user.permissions?.some((p: any) => p === "projects.create") || false,
                    canDeleteProjects:
                      user.permissions?.some((p: any) => p === "projects.delete") || false,
                    canManageSystemSettings:
                      user.permissions?.some((p: any) => p === "settings.update") || false,
                    canViewSystemLogs: false, // Not available in current permission system
                    canManageBackups: false, // Not available in current permission system
                    canAccessAllProjects:
                      user.permissions?.some((p: any) => p === "projects.read") || false,
                    restrictedProjectIds: [],
                    canManageDatabase:
                      user.permissions?.some(
                        (p: any) =>
                          p === "collections.create" ||
                          p === "collections.write" ||
                          p === "collections.delete"
                      ) || false,
                    canManageAPI: false, // Not available in current permission system
                    canManageFiles:
                      user.permissions?.some(
                        (p: any) => p === "storage.upload" || p === "storage.delete"
                      ) || false,
                    canManageAuth: false, // Not available in current permission system
                    canCreateAdminAccounts: false, // Not available in current permission system
                    canModifyOtherAdmins: false, // Not available in current permission system
                    isMasterAdmin: user.role === "master_admin",
                  },
                  lastActive: user.last_login || user.updated_at,
                  createdAt: user.created_at,
                  lastLogin: user.last_login || "",
                }));
                setAdminUsers(transformedUsers);
              } else {
                console.error("Failed to fetch admin users:", response.error);
                setAdminUsers([]);
              }
            } catch (error) {
              console.error("Error fetching admin users:", error);
              setAdminUsers([]);
            } finally {
              setIsLoading(false);
            }
          };
          fetchAdminUsers();
          toast.success("Admin user updated successfully");
        }}
      />
    </div>
  );
}
