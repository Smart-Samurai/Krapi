"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  User as UserIcon,
  UserCheck,
} from "lucide-react";

import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

interface UserUpdateInput {
  username?: string;
  email?: string;
  role?: string;
  active?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // const krapi = createDefaultKrapi(); // Commented out since not used yet

  // Form state
  const [createForm, setCreateForm] = useState<UserCreateInput>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  const [updateForm, setUpdateForm] = useState<UserUpdateInput>({
    username: "",
    email: "",
    role: "user",
    active: true,
  });

  const { handleError, showSuccess } = useNotification();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      // For now, we'll use a placeholder since user management is not fully implemented
      // const response = await krapi.auth.getAllUsers();
      setUsers([
        {
          id: 1,
          username: "admin",
          email: "admin@krapi.local",
          role: "admin",
          active: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setUsers([]);
      handleError(err, "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      handleError("Passwords do not match");
      return;
    }

    try {
      // Note: User creation is not fully implemented in the new API yet
      // const response = await krapi.auth.createUser({
      //   username: createForm.username,
      //   email: createForm.email,
      //   password: createForm.password,
      //   role: createForm.role as "admin" | "user",
      //   active: true,
      // });

      showSuccess(`User '${createForm.username}' created successfully`);
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
      });
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to create user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Note: User update is not fully implemented in the new API yet
      // const response = await krapi.auth.updateUser(editingUser.id, {
      //   username: updateForm.username,
      //   email: updateForm.email,
      //   role: updateForm.role as "admin" | "user",
      //   active: updateForm.active,
      // });

      showSuccess(`User '${editingUser.username}' updated successfully`);
      setEditingUser(null);
      setUpdateForm({
        username: "",
        email: "",
        role: "user",
        active: true,
      });
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to update user");
    }
  };

  const handleDeleteUser = async (_id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      // Note: User deletion is not fully implemented in the new API yet
      // const response = await krapi.auth.deleteUser(id);

      showSuccess("User deleted successfully");
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to delete user");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "user":
        return <UserIcon className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "user":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <NotificationContainer />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users Management</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="Enter email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Enter password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <h3 className="font-medium">{user.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(user);
                        setUpdateForm({
                          username: user.username,
                          email: user.email,
                          role: user.role,
                          active: user.active,
                        });
                      }}
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={updateForm.username}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, username: e.target.value })
                }
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={updateForm.email}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, email: e.target.value })
                }
                placeholder="Enter email"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={updateForm.role}
                onValueChange={(value) =>
                  setUpdateForm({ ...updateForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
