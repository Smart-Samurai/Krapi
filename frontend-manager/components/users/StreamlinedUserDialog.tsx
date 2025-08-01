"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FiInfo } from "react-icons/fi";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Project, Scope } from "@krapi/sdk";

interface StreamlinedUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editUser?: any; // Replace with proper type
}

type AccountType = "master_admin" | "project_admin" | "limited_admin";

interface AccountTypeInfo {
  title: string;
  description: string;
  scopes: Scope[];
}

const ACCOUNT_TYPES: Record<AccountType, AccountTypeInfo> = {
  master_admin: {
    title: "Master Admin",
    description:
      "Full access to everything in Krapi, including all projects, system settings, and user management",
    scopes: [Scope.MASTER],
  },
  project_admin: {
    title: "Project Admin",
    description:
      "Full access to selected projects, including all data, settings, and project-specific users",
    scopes: [
      Scope.PROJECTS_READ,
      Scope.PROJECTS_WRITE,
      Scope.COLLECTIONS_READ,
      Scope.COLLECTIONS_WRITE,
      Scope.COLLECTIONS_DELETE,
      Scope.DOCUMENTS_READ,
      Scope.DOCUMENTS_WRITE,
      Scope.DOCUMENTS_DELETE,
      Scope.STORAGE_READ,
      Scope.STORAGE_WRITE,
      Scope.STORAGE_DELETE,
      Scope.ADMIN_READ,
      Scope.ADMIN_WRITE,
    ],
  },
  limited_admin: {
    title: "Limited Admin",
    description: "Custom access level with fine-tuned permissions",
    scopes: [], // Will be customized
  },
};

const PERMISSION_GROUPS = {
  projects: {
    label: "Projects",
    permissions: [
      { scope: Scope.PROJECTS_READ, label: "View Projects" },
      { scope: Scope.PROJECTS_WRITE, label: "Create/Edit Projects" },
      { scope: Scope.PROJECTS_DELETE, label: "Delete Projects" },
    ],
  },
  data: {
    label: "Data Management",
    permissions: [
      { scope: Scope.COLLECTIONS_READ, label: "View Collections" },
      { scope: Scope.COLLECTIONS_WRITE, label: "Create/Edit Collections" },
      { scope: Scope.COLLECTIONS_DELETE, label: "Delete Collections" },
      { scope: Scope.DOCUMENTS_READ, label: "Read Documents" },
      { scope: Scope.DOCUMENTS_WRITE, label: "Write Documents" },
      { scope: Scope.DOCUMENTS_DELETE, label: "Delete Documents" },
    ],
  },
  storage: {
    label: "File Storage",
    permissions: [
      { scope: Scope.STORAGE_READ, label: "View Files" },
      { scope: Scope.STORAGE_WRITE, label: "Upload Files" },
      { scope: Scope.STORAGE_DELETE, label: "Delete Files" },
    ],
  },
  users: {
    label: "User Management",
    permissions: [
      { scope: Scope.ADMIN_READ, label: "View Admin Users" },
      { scope: Scope.ADMIN_WRITE, label: "Create/Edit Admin Users" },
      { scope: Scope.ADMIN_DELETE, label: "Delete Admin Users" },
    ],
  },
  admin: {
    label: "Administration",
    permissions: [
      { scope: Scope.ADMIN_READ, label: "View Admin Settings" },
      { scope: Scope.ADMIN_WRITE, label: "Modify Admin Settings" },
      { scope: Scope.ADMIN_DELETE, label: "Delete Admin Resources" },
    ],
  },
};

export function StreamlinedUserDialog({
  open,
  onOpenChange,
  onSuccess,
  editUser,
}: StreamlinedUserDialogProps) {
  const krapi = useKrapi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("limited_admin");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<Scope[]>([]);

  // Projects list
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (open && krapi) {
      fetchProjects();
    }
  }, [open, krapi]);

  useEffect(() => {
    if (editUser) {
      setUsername(editUser.username || "");
      setEmail(editUser.email || "");

      // Determine account type from scopes
      if (editUser.scopes?.includes(Scope.MASTER)) {
        setAccountType("master_admin");
      } else if (editUser.project_ids?.length > 0) {
        setAccountType("project_admin");
        setSelectedProjects(editUser.project_ids);
      } else {
        setAccountType("limited_admin");
        setSelectedScopes(editUser.scopes || []);
      }
    }
  }, [editUser]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await krapi!.projects.getAll();
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async () => {
    if (!krapi) return;

    // Validation
    if (!username || !email) {
      setError("Username and email are required");
      return;
    }

    if (!editUser && (!password || password !== confirmPassword)) {
      setError("Passwords don't match");
      return;
    }

    if (accountType === "project_admin" && selectedProjects.length === 0) {
      setError("Please select at least one project");
      return;
    }

    if (accountType === "limited_admin" && selectedScopes.length === 0) {
      setError("Please select at least one permission");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Determine final scopes
      let finalScopes: Scope[] = [];
      let projectIds: string[] | undefined;

      if (accountType === "master_admin") {
        finalScopes = ACCOUNT_TYPES.master_admin.scopes;
      } else if (accountType === "project_admin") {
        finalScopes = ACCOUNT_TYPES.project_admin.scopes;
        projectIds = selectedProjects;
      } else {
        finalScopes = selectedScopes;
      }

      const userData: any = {
        username,
        email,
        password: editUser ? undefined : password,
        role: accountType === "master_admin" ? "master_admin" : "admin",
        access_level: accountType === "master_admin" ? "full" : "read_write",
        scopes: finalScopes,
        project_ids: projectIds,
      };

      let response;
      if (editUser) {
        response = await krapi.admin.updateUser(editUser.id, userData);
      } else {
        response = await krapi.admin.createUser(userData);
      }

      if (response.success) {
        onOpenChange(false);
        onSuccess?.();

        // Reset form
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAccountType("limited_admin");
        setSelectedProjects([]);
        setSelectedScopes([]);
      } else {
        setError(response.error || "Failed to save user");
      }
    } catch (err) {
      console.error("Error saving user:", err);
      setError("An error occurred while saving the user");
    } finally {
      setLoading(false);
    }
  };

  const handleScopeToggle = (scope: Scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editUser ? "Edit Admin User" : "Create Admin User"}
          </DialogTitle>
          <DialogDescription>
            Configure admin access for the Krapi management panel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {!editUser && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Account Type */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Account Type</h3>
            <Select
              value={accountType}
              onValueChange={(value) => setAccountType(value as AccountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <p className="font-medium">{info.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Selection (for project admins) */}
          {accountType === "project_admin" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Project Access</h3>
              <Alert>
                <FiInfo className="h-4 w-4" />
                <AlertDescription>
                  Select the projects this admin should have full access to
                </AlertDescription>
              </Alert>
              {loadingProjects ? (
                <p className="text-sm text-muted-foreground">
                  Loading projects...
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={project.id}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects([
                              ...selectedProjects,
                              project.id,
                            ]);
                          } else {
                            setSelectedProjects(
                              selectedProjects.filter((id) => id !== project.id)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={project.id}
                        className="flex-1 cursor-pointer"
                      >
                        {project.name}
                        {project.description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {project.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Permissions (for limited admins) */}
          {accountType === "limited_admin" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Custom Permissions</h3>
              <Alert>
                <FiInfo className="h-4 w-4" />
                <AlertDescription>
                  Select specific permissions for this admin account
                </AlertDescription>
              </Alert>
              <div className="space-y-4">
                {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.permissions.map((perm, id) => (
                        <div
                          key={`${perm.scope}-${id}`}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={perm.scope}
                            checked={selectedScopes.includes(perm.scope)}
                            onCheckedChange={() =>
                              handleScopeToggle(perm.scope)
                            }
                          />
                          <Label
                            htmlFor={perm.scope}
                            className="text-sm cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : editUser ? "Update User" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
