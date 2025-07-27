"use client";

import React, { useState } from "react";
import {
  Button,
  InfoBlock,
  IconButton,
  TextButton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  FiPlus,
  FiUsers,
  FiUser,
  FiMail,
  FiShield,
  FiEdit,
  FiTrash2,
  FiMoreVertical,
  FiSearch,
  FiFilter,
} from "react-icons/fi";

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "user", "moderator"]),
  projectId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const users = [
    {
      id: "user-001",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      role: "admin",
      status: "active",
      lastLogin: "2 hours ago",
      projects: ["E-commerce Platform", "Mobile App Backend"],
      createdAt: "2024-01-15",
    },
    {
      id: "user-002",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      role: "user",
      status: "active",
      lastLogin: "1 day ago",
      projects: ["Analytics Dashboard"],
      createdAt: "2024-02-01",
    },
    {
      id: "user-003",
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike.johnson@example.com",
      role: "moderator",
      status: "inactive",
      lastLogin: "1 week ago",
      projects: ["Content Management System"],
      createdAt: "2024-01-20",
    },
    {
      id: "user-004",
      firstName: "Sarah",
      lastName: "Wilson",
      email: "sarah.wilson@example.com",
      role: "user",
      status: "active",
      lastLogin: "3 hours ago",
      projects: ["E-commerce Platform"],
      createdAt: "2024-02-10",
    },
  ];

  const handleCreateUser = async (data: UserFormData) => {
    console.log("Creating user:", data);
    setIsCreateDialogOpen(false);
    // Here you would typically make an API call
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "moderator":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "user":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Users</h1>
          <p className="text-text/60 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with appropriate permissions
                </DialogDescription>
              </DialogHeader>
              <Form schema={userSchema} onSubmit={handleCreateUser}>
                <div className="space-y-4">
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
                  <FormField
                    name="role"
                    label="Role"
                    type="select"
                    options={[
                      { value: "user", label: "User" },
                      { value: "moderator", label: "Moderator" },
                      { value: "admin", label: "Admin" },
                    ]}
                    required
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Add User
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Users</p>
              <p className="text-2xl font-bold text-text mt-1">
                {users.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiUsers className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Active Users</p>
              <p className="text-2xl font-bold text-text mt-1">
                {users.filter((u) => u.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiUser className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Admins</p>
              <p className="text-2xl font-bold text-text mt-1">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <FiShield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Moderators</p>
              <p className="text-2xl font-bold text-text mt-1">
                {users.filter((u) => u.role === "moderator").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <FiShield className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="secondary">
            <FiFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">All Users</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiUser className="h-5 w-5 text-primary" />
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
                        {user.role}
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
                      <span>Last login: {user.lastLogin}</span>
                      <span>{user.projects.length} projects</span>
                      <span>Joined {user.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit User"
                  />
                  <IconButton
                    icon={FiTrash2}
                    variant="secondary"
                    size="sm"
                    title="Delete User"
                  />
                  <IconButton
                    icon={FiMoreVertical}
                    variant="secondary"
                    size="sm"
                    title="More Options"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Block */}
      <InfoBlock
        title="User Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            <strong>Admin:</strong> Full access to all projects and system
            settings
          </p>
          <p>
            <strong>Moderator:</strong> Can manage users and content within
            assigned projects
          </p>
          <p>
            <strong>User:</strong> Standard access to assigned projects and
            features
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
