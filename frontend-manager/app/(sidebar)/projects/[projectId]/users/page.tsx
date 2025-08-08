"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { ProjectUser } from "@/lib/krapi";
import { ProjectScope } from "@krapi/sdk";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { beginBusy, endBusy } from "@/store/uiSlice";
import { fetchUsers, createUser, updateUser, deleteUser } from "@/store/usersSlice";

const scopeLabels: Record<ProjectScope, string> = {
  [ProjectScope.USERS_READ]: "Read Users",
  [ProjectScope.USERS_WRITE]: "Write Users",
  [ProjectScope.USERS_DELETE]: "Delete Users",
  [ProjectScope.DATA_READ]: "Read Data",
  [ProjectScope.DATA_WRITE]: "Write Data",
  [ProjectScope.DATA_DELETE]: "Delete Data",
  [ProjectScope.FILES_READ]: "Read Files",
  [ProjectScope.FILES_WRITE]: "Write Files",
  [ProjectScope.FILES_DELETE]: "Delete Files",
  [ProjectScope.FUNCTIONS_EXECUTE]: "Execute Functions",
  [ProjectScope.EMAIL_SEND]: "Send Emails",
};

export default function UsersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const dispatch = useAppDispatch();
  const bucket = useAppSelector((s) => s.users.byProjectId[projectId]);
  const users = bucket?.items || [];
  const isLoading = bucket?.loading || false;

  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProjectUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state for creating/editing users
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    access_scopes: [] as string[],
    custom_fields: {} as Record<string, any>,
  });

  const loadUsersCb = useCallback(() => {
    dispatch(fetchUsers({ projectId }));
  }, [dispatch, projectId]);

  useEffect(() => {
    loadUsersCb();
  }, [loadUsersCb]);

  const handleCreateUser = async () => {
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        createUser({ projectId, payload: { ...formData } as any })
      );
      if (createUser.fulfilled.match(action)) {
        setIsCreateDialogOpen(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          access_scopes: [],
          custom_fields: {},
        });
        loadUsersCb();
      } else {
        const msg = (action as any).payload || "Failed to create user";
        setError(String(msg));
      }
    } catch (err) {
      setError("An error occurred while creating user");
      console.error("Error creating user:", err);
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      dispatch(beginBusy());
      const updates: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        access_scopes: formData.access_scopes,
        custom_fields: formData.custom_fields,
      };
      if (formData.password) updates.password = formData.password;

      const action = await dispatch(
        updateUser({ projectId, userId: editingUser.id, updates })
      );

      if (updateUser.fulfilled.match(action)) {
        setIsEditDialogOpen(false);
        setEditingUser(null);
        setFormData({
          username: "",
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          access_scopes: [],
          custom_fields: {},
        });
        loadUsersCb();
      } else {
        const msg = (action as any).payload || "Failed to update user";
        setError(String(msg));
      }
    } catch (err) {
      setError("An error occurred while updating user");
      console.error("Error updating user:", err);
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      dispatch(beginBusy());
      const action = await dispatch(deleteUser({ projectId, userId }));
      if (deleteUser.fulfilled.match(action)) {
        loadUsersCb();
      } else {
        const msg = (action as any).payload || "Failed to delete user";
        setError(String(msg));
      }
    } catch (err) {
      setError("An error occurred while deleting user");
      console.error("Error deleting user:", err);
    } finally {
      dispatch(endBusy());
    }
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      access_scopes: prev.access_scopes.includes(scope)
        ? prev.access_scopes.filter((s) => s !== scope)
        : [...prev.access_scopes, scope],
    }));
  };

  const openEditDialog = (user: ProjectUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      access_scopes: user.access_scopes,
      custom_fields: user.custom_fields || {},
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage project users and their access permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to this project with specific access scopes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Access Scopes</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(scopeLabels).map(([scope, label]) => (
                    <div key={scope} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope}
                        checked={formData.access_scopes.includes(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      <Label htmlFor={scope} className="text-sm font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={
                  !formData.username || !formData.email || !formData.password
                }
              >
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Users Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first user to start managing project access
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Project Users</CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? "s" : ""} in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge
                          variant={user.is_verified ? "default" : "outline"}
                        >
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.access_scopes.slice(0, 3).map((scope) => (
                          <Badge
                            key={scope}
                            variant="outline"
                            className="text-xs"
                          >
                            {scopeLabels[scope as ProjectScope] || scope}
                          </Badge>
                        ))}
                        {user.access_scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.access_scopes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(user.register_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user information and access permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first_name">First Name</Label>
                <Input
                  id="edit-first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="edit-last_name">Last Name</Label>
                <Input
                  id="edit-last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">
                Password (leave blank to keep current)
              </Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label>Access Scopes</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(scopeLabels).map(([scope, label]) => (
                  <div key={scope} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${scope}`}
                      checked={formData.access_scopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <Label
                      htmlFor={`edit-${scope}`}
                      className="text-sm font-normal"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={!formData.username || !formData.email}
            >
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
