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

import { Plus, Search, AlertCircle } from "lucide-react";
import React from "react";
import { toast } from "sonner";

import {
  AdminUsersStats,
  AdminUsersList,
  useAdminUsers,
  adminUserSchema,
} from "@/components/admin-users";
import { PageLayout, PageHeader, ActionButton } from "@/components/common";
import { Form, FormField } from "@/components/forms";
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
import { AdminRole, AccessLevel, Scope } from "@/lib/krapi-constants";
import { ExtendedAdminUser } from "@/lib/types/extended";

/**
 * Admin Users Page Component
 *
 * Provides admin user management interface.
 *
 * @returns {JSX.Element} Admin users page
 */
export default function ServerAdministrationPage() {
  const {
    hasScope,
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
  } = useAdminUsers();

  // Error state
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
      <AdminUsersStats adminUsers={adminUsers} isLoading={isLoading} />

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search admin users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Admin Users List */}
      <div className="bg-background border border-secondary">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-base font-semibold text-text">
            Administrative Users
          </h2>
        </div>
        <AdminUsersList
          users={filteredUsers}
          isLoading={isLoading}
          hasScope={hasScope}
          onViewUser={(user) => {
            setSelectedUser(user);
            setIsEditDialogOpen(true);
          }}
          onEditUser={(user) => {
            setSelectedUser(user);
            setIsEditDialogOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteUser={handleDeleteAdmin}
        />
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
                accessLevel: "full",
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
                <ActionButton variant="edit">Update Admin User</ActionButton>
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

      {/* Create Dialog */}
      <StreamlinedUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          loadUsers();
          toast.success("Admin user created successfully");
        }}
      />

      {/* Edit Dialog using StreamlinedUserDialog */}
      <StreamlinedUserDialog
        open={isEditDialogOpen && !!selectedUser}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
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
