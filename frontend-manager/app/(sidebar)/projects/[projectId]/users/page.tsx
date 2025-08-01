"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Users,
  MoreVertical,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Key,
  Search,
} from "lucide-react";
import { ProjectUser, ProjectScope, Scope } from "@/lib/krapi";
import { ScopeGuard } from "@/components/scope-guard";

const PROJECT_SCOPES = [
  {
    value: ProjectScope.USERS_READ,
    label: "Users Read",
    description: "View other users",
  },
  {
    value: ProjectScope.USERS_WRITE,
    label: "Users Write",
    description: "Create/update users",
  },
  {
    value: ProjectScope.USERS_DELETE,
    label: "Users Delete",
    description: "Delete users",
  },
  {
    value: ProjectScope.DATA_READ,
    label: "Data Read",
    description: "View project data",
  },
  {
    value: ProjectScope.DATA_WRITE,
    label: "Data Write",
    description: "Create/update data",
  },
  {
    value: ProjectScope.DATA_DELETE,
    label: "Data Delete",
    description: "Delete data",
  },
  {
    value: ProjectScope.FILES_READ,
    label: "Files Read",
    description: "View/download files",
  },
  {
    value: ProjectScope.FILES_WRITE,
    label: "Files Write",
    description: "Upload files",
  },
  {
    value: ProjectScope.FILES_DELETE,
    label: "Files Delete",
    description: "Delete files",
  },
  {
    value: ProjectScope.FUNCTIONS_EXECUTE,
    label: "Functions Execute",
    description: "Run functions",
  },
  {
    value: ProjectScope.EMAIL_SEND,
    label: "Email Send",
    description: "Send emails",
  },
];

export default function ProjectUsersPage() {
  const { krapi, hasScope } = useAuth();
  const params = useParams();
  const projectId = params.projectId as string;

  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScopesDialog, setShowScopesDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProjectUser | null>(null);

  // New user form
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    scopes: [ProjectScope.DATA_READ, ProjectScope.FILES_READ],
  });

  // Selected scopes for editing
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, [projectId]);

  const loadUsers = async () => {
    if (!krapi || !projectId) return;

    try {
      setLoading(true);
      const response = await krapi.users.getAll(projectId, {
        search: searchQuery,
      });
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!krapi || !projectId) return;

    try {
      const response = await krapi.users.create(projectId, newUser);
      if (response.success && response.data) {
        setUsers([...users, response.data]);
        setShowCreateDialog(false);
        setNewUser({
          username: "",
          email: "",
          password: "",
          phone: "",
          scopes: [ProjectScope.DATA_READ, ProjectScope.FILES_READ],
        });
        toast.success("User created successfully");
      }
    } catch (error: any) {
      console.error("Failed to create user:", error);
      toast.error(error.response?.data?.error || "Failed to create user");
    }
  };

  const updateUserScopes = async () => {
    if (!krapi || !projectId || !selectedUser) return;

    try {
      const response = await krapi.users.updateScopes(
        projectId,
        selectedUser.id,
        selectedScopes
      );
      if (response.success && response.data) {
        if (response.data) {
          setUsers(
            users
              .map((u) => (u.id === selectedUser.id ? response.data : u))
              .filter((u): u is ProjectUser => u !== undefined)
          );
        }
        setShowScopesDialog(false);
        toast.success("User scopes updated");
      }
    } catch (error) {
      console.error("Failed to update scopes:", error);
      toast.error("Failed to update scopes");
    }
  };

  const toggleUserStatus = async (user: ProjectUser) => {
    if (!krapi || !projectId) return;

    try {
      const response = await krapi.users.update(projectId, user.id, {
        is_active: !user.is_active,
      });
      if (response.success && response.data) {
        if (response.data) {
          setUsers(
            users
              .map((u) => (u.id === user.id ? response.data : u))
              .filter((u): u is ProjectUser => u !== undefined)
          );
        }
        toast.success(
          `User ${response.data.is_active ? "activated" : "deactivated"}`
        );
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };

  const deleteUser = async (userId: string) => {
    if (
      !krapi ||
      !projectId ||
      !confirm("Are you sure you want to delete this user?")
    )
      return;

    try {
      const response = await krapi.users.delete(projectId, userId);
      if (response.success) {
        setUsers(users.filter((u) => u.id !== userId));
        toast.success("User deleted");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Users</h1>
          <p className="text-muted-foreground">Manage users for this project</p>
        </div>
        <ScopeGuard scopes={Scope.PROJECTS_WRITE}>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to this project with specific permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    placeholder="johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {PROJECT_SCOPES.map((scope) => (
                      <div
                        key={scope.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={scope.value}
                          checked={newUser.scopes.includes(scope.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser({
                                ...newUser,
                                scopes: [...newUser.scopes, scope.value],
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                scopes: newUser.scopes.filter(
                                  (s) => s !== scope.value
                                ),
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={scope.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          <span className="font-medium">{scope.label}</span>
                          <span className="text-muted-foreground ml-2">
                            {scope.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createUser}>Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ScopeGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && loadUsers()}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {user.id.substring(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {user.email}
                        {user.is_verified && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {user.scopes.length} scopes
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ScopeGuard
                      scopes={Scope.PROJECTS_WRITE}
                      showRequirements={false}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedScopes(user.scopes);
                              setShowScopesDialog(true);
                            }}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleUserStatus(user)}
                          >
                            {user.is_active ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteUser(user.id)}
                          >
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ScopeGuard>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scopes Management Dialog */}
      <Dialog open={showScopesDialog} onOpenChange={setShowScopesDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage User Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-96 overflow-y-auto">
            {PROJECT_SCOPES.map((scope) => (
              <div key={scope.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-${scope.value}`}
                  checked={selectedScopes.includes(scope.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedScopes([...selectedScopes, scope.value]);
                    } else {
                      setSelectedScopes(
                        selectedScopes.filter((s) => s !== scope.value)
                      );
                    }
                  }}
                />
                <Label
                  htmlFor={`edit-${scope.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  <span className="font-medium">{scope.label}</span>
                  <span className="text-muted-foreground ml-2">
                    {scope.description}
                  </span>
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScopesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={updateUserScopes}>Update Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
