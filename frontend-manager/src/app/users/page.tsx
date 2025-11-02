"use client";

import {
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Shield,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: "master_admin" | "admin" | "user";
  is_active: boolean;
  created_at: string;
  last_login?: string;
  permissions?: string[];
}

interface ProjectUser {
  id: string;
  username: string;
  email?: string;
  project_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

const USER_ROLES = [
  {
    id: "master_admin",
    name: "Master Admin",
    description: "Full system access",
  },
  { id: "admin", name: "Admin", description: "Administrative access" },
  { id: "user", name: "User", description: "Basic user access" },
];

const PROJECT_ROLES = [
  { id: "owner", name: "Owner", description: "Full project control" },
  { id: "admin", name: "Admin", description: "Project administration" },
  { id: "editor", name: "Editor", description: "Edit project content" },
  { id: "viewer", name: "Viewer", description: "View project content" },
];

export default function UsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateProjectUser, setShowCreateProjectUser] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Form states
  const [newAdminUser, setNewAdminUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as const,
  });

  const [newProjectUser, setNewProjectUser] = useState({
    username: "",
    email: "",
    password: "",
    project_id: "",
    role: "viewer" as const,
  });

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch("/api/krapi/k1/admin/users");
      if (!response.ok) throw new Error("Failed to fetch admin users");
      const data = await response.json();
      setAdminUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchProjectUsers = async () => {
    try {
      const response = await fetch("/api/krapi/k1/admin/project-users");
      if (!response.ok) throw new Error("Failed to fetch project users");
      const data = await response.json();
      setProjectUsers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/krapi/k1/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createAdminUser = async () => {
    try {
      const response = await fetch("/api/krapi/k1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdminUser),
      });
      if (!response.ok) throw new Error("Failed to create admin user");
      await fetchAdminUsers();
      setShowCreateAdmin(false);
      setNewAdminUser({ username: "", email: "", password: "", role: "user" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createProjectUser = async () => {
    try {
      const response = await fetch("/api/krapi/k1/admin/project-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectUser),
      });
      if (!response.ok) throw new Error("Failed to create project user");
      await fetchProjectUsers();
      setShowCreateProjectUser(false);
      setNewProjectUser({
        username: "",
        email: "",
        password: "",
        project_id: "",
        role: "viewer",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const toggleUserStatus = async (userId: string, isAdmin: boolean) => {
    try {
      const endpoint = isAdmin
        ? `/api/krapi/k1/admin/users/${userId}/toggle`
        : `/api/krapi/k1/admin/project-users/${userId}/toggle`;

      const response = await fetch(endpoint, {
        method: "PUT",
      });
      if (!response.ok) throw new Error("Failed to toggle user status");

      if (isAdmin) {
        await fetchAdminUsers();
      } else {
        await fetchProjectUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteUser = async (userId: string, isAdmin: boolean) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const endpoint = isAdmin
        ? `/api/krapi/k1/admin/users/${userId}`
        : `/api/krapi/k1/admin/project-users/${userId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");

      if (isAdmin) {
        await fetchAdminUsers();
      } else {
        await fetchProjectUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "master_admin":
        return "bg-red-100 text-red-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-green-100 text-green-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAdminUsers(),
        fetchProjectUsers(),
        fetchProjects(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredAdminUsers = adminUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProjectUsers = projectUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (selectedProject && user.project_id === selectedProject)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage admin users and project users</p>
        </div>
        <div className="flex space-x-2">
          <Dialog
            open={showCreateProjectUser}
            onOpenChange={setShowCreateProjectUser}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Project User
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin User
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Admin Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Admin Users</span>
          </CardTitle>
          <CardDescription>
            System administrators with global access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAdminUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{user.username}</h4>
                      <p className="text-sm text-gray-600">
                        {user.email && `${user.email} ? `}
                        Created: {formatDate(user.created_at)}
                        {user.last_login &&
                          ` ? Last login: ${formatDate(user.last_login)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(user.id, true)}
                    >
                      {user.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(user.id, true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Project Users</span>
          </CardTitle>
          <CardDescription>
            Users with access to specific projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjectUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-medium">{user.username}</h4>
                      <p className="text-sm text-gray-600">
                        {user.email && `${user.email} ? `}
                        Project:{" "}
                        {projects.find((p) => p.id === user.project_id)?.name ||
                          user.project_id}
                        {` ? Created: ${formatDate(user.created_at)}`}
                        {user.last_login &&
                          ` ? Last login: ${formatDate(user.last_login)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role.toUpperCase()}
                    </Badge>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(user.id, false)}
                    >
                      {user.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(user.id, false)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Admin User Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin User</DialogTitle>
            <DialogDescription>
              Create a new system administrator user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                value={newAdminUser.username}
                onChange={(e) =>
                  setNewAdminUser({ ...newAdminUser, username: e.target.value })
                }
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={newAdminUser.email}
                onChange={(e) =>
                  setNewAdminUser({ ...newAdminUser, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={newAdminUser.password}
                onChange={(e) =>
                  setNewAdminUser({ ...newAdminUser, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="admin-role">Role</Label>
              <Select
                value={newAdminUser.role}
                onValueChange={(value: string) =>
                  setNewAdminUser({ ...newAdminUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAdmin(false)}>
              Cancel
            </Button>
            <Button
              onClick={createAdminUser}
              disabled={!newAdminUser.username || !newAdminUser.password}
            >
              Create Admin User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project User Dialog */}
      <Dialog
        open={showCreateProjectUser}
        onOpenChange={setShowCreateProjectUser}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project User</DialogTitle>
            <DialogDescription>
              Create a new user for a specific project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-username">Username</Label>
              <Input
                id="project-username"
                value={newProjectUser.username}
                onChange={(e) =>
                  setNewProjectUser({
                    ...newProjectUser,
                    username: e.target.value,
                  })
                }
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="project-email">Email</Label>
              <Input
                id="project-email"
                type="email"
                value={newProjectUser.email}
                onChange={(e) =>
                  setNewProjectUser({
                    ...newProjectUser,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="project-password">Password</Label>
              <Input
                id="project-password"
                type="password"
                value={newProjectUser.password}
                onChange={(e) =>
                  setNewProjectUser({
                    ...newProjectUser,
                    password: e.target.value,
                  })
                }
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="project-select">Project</Label>
              <Select
                value={newProjectUser.project_id}
                onValueChange={(value) =>
                  setNewProjectUser({ ...newProjectUser, project_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project-role">Role</Label>
              <Select
                value={newProjectUser.role}
                onValueChange={(value: string) =>
                  setNewProjectUser({ ...newProjectUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateProjectUser(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createProjectUser}
              disabled={
                !newProjectUser.username ||
                !newProjectUser.password ||
                !newProjectUser.project_id
              }
            >
              Create Project User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

