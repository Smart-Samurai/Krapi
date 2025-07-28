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
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import {
  FiPlus,
  FiUsers,
  FiEdit,
  FiTrash2,
  FiEye,
  FiSearch,
  FiMail,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiMoreVertical,
} from "react-icons/fi";

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "developer", "viewer"]),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const users = [
    {
      id: "N/I",
      name: "Not Implemented",
      email: "N/I",
      role: "N/I",
      status: "N/I",
      lastActive: "N/I",
      projects: ["N/I"],
    },
  ];

  const handleCreateUser = async (data: UserFormData) => {
    console.log("Creating user:", data);
    setIsCreateDialogOpen(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg">
              <FiPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for your platform
              </DialogDescription>
            </DialogHeader>
            <Form
              schema={userSchema}
              onSubmit={handleCreateUser}
              className="space-y-4"
            >
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
              <FormField
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                required
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">
                  Role
                </label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Users</p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
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
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiUserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Admin Users
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiShield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Inactive Users
              </p>
              <p className="text-2xl font-bold text-text mt-1">N/I</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <FiUserX className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">All Users</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredUsers.map((user, index) => (
            <div
              key={index}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FiUsers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{user.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                        {user.role}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                        {user.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">{user.email}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Last active: {user.lastActive}</span>
                      <span>Projects: {user.projects.join(", ")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiEye}
                    variant="secondary"
                    size="sm"
                    title="View User"
                  />
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit User"
                  />
                  <IconButton
                    icon={FiMail}
                    variant="secondary"
                    size="sm"
                    title="Send Email"
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

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="bg-background border border-secondary rounded-lg p-12 text-center">
          <FiUsers className="h-12 w-12 text-text/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            No users found
          </h3>
          <p className="text-text/60 mb-4">
            {searchQuery
              ? "Try adjusting your search query"
              : "Add your first user to get started"}
          </p>
          {!searchQuery && (
            <Button
              variant="default"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      )}

      {/* Info Block */}
      <InfoBlock
        title="User Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            Users can have different roles with varying levels of access:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Admin:</strong> Full access to all features and settings</li>
            <li><strong>Developer:</strong> Access to projects, database, and API management</li>
            <li><strong>Viewer:</strong> Read-only access to data and analytics</li>
          </ul>
        </div>
      </InfoBlock>
    </div>
  );
}
