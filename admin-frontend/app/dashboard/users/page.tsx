"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  User as UserIcon,
  UserCheck,
} from "lucide-react";
import { usersAPI } from "@/lib/api";
import { User, ApiResponse, UserFilters } from "@/types";
import {
  userCreateSchema,
  userUpdateSchema,
  UserCreateInput,
  UserUpdateInput,
} from "@/lib/schemas";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/Notification";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters] = useState<UserFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { handleError, showSuccess } = useNotification();

  const createForm = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "viewer",
    },
  });

  const updateForm = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      role: "viewer",
    },
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response: ApiResponse<User[]> = await usersAPI.getAllUsers(filters);
      if (response.success && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : []);
      } else {
        setUsers([]);
        handleError(response.error || "Failed to load users");
      }
    } catch (err) {
      setUsers([]);
      handleError(err, "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filters, handleError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (data: UserCreateInput) => {
    try {
      const response = await usersAPI.createUser({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        permissions: [],
        active: true,
      });
      if (response.success) {
        setShowCreateModal(false);
        createForm.reset();
        loadUsers();
        showSuccess(`User '${data.username}' created successfully`);
      } else {
        handleError(response.error || "Failed to create user");
      }
    } catch (err) {
      handleError(err, "Failed to create user");
    }
  };

  const handleUpdateUser = async (data: UserUpdateInput) => {
    if (!editingUser) return;

    try {
      const response = await usersAPI.updateUser(editingUser.id, {
        role: data.role,
      });
      if (response.success) {
        setEditingUser(null);
        updateForm.reset();
        loadUsers();
        showSuccess(`User updated successfully`);
      } else {
        handleError(response.error || "Failed to update user");
      }
    } catch (err) {
      handleError(err, "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await usersAPI.deleteUser(id);
      if (response.success) {
        loadUsers();
        showSuccess("User deleted successfully");
      } else {
        handleError(response.error || "Failed to delete user");
      }
    } catch (err) {
      handleError(err, "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "editor":
        return <UserCheck className="h-4 w-4 text-primary-500 dark:text-primary-400" />;
      case "viewer":
        return <UserIcon className="h-4 w-4 text-text-500 dark:text-text-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-text-500 dark:text-text-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <NotificationContainer />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-900 dark:text-text-50">Users</h1>
          <p className="text-text-600 dark:text-text-400">
            Manage system users and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-primary-500 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-400 dark:text-text-600 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-background-300 dark:border-background-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-6 py-4 text-center text-text-500 dark:text-text-500">
              Loading users...
            </li>
          ) : filteredUsers.length === 0 ? (
            <li className="px-6 py-4 text-center text-text-500 dark:text-text-500">
              No users found
            </li>
          ) : (
            filteredUsers.map((user) => (
              <li key={user.id} className="px-6 py-4 hover:bg-background-50 dark:bg-background-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-text-900 dark:text-text-50">
                          {user.username}
                        </h3>
                        {user.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 dark:bg-red-900 dark:text-red-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-500 dark:text-text-500 capitalize">
                        {user.role}
                      </p>
                      {user.email && (
                        <p className="text-sm text-text-500 dark:text-text-500">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        updateForm.setValue(
                          "role",
                          user.role as "admin" | "editor" | "viewer"
                        );
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background-900 dark:bg-background-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-background-100 dark:bg-background-100">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-4">
                Create New User
              </h3>
              <form
                onSubmit={createForm.handleSubmit(handleCreateUser)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Username
                  </label>
                  <input
                    type="text"
                    {...createForm.register("username")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {createForm.formState.errors.username && (
                    <p className="mt-1 text-sm text-red-600">
                      {createForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Email
                  </label>
                  <input
                    type="email"
                    {...createForm.register("email")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {createForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Password
                  </label>
                  <input
                    type="password"
                    {...createForm.register("password")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {createForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {createForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    {...createForm.register("confirmPassword")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {createForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {createForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Role
                  </label>
                  <select
                    {...createForm.register("role")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {createForm.formState.errors.role && (
                    <p className="mt-1 text-sm text-red-600">
                      {createForm.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      createForm.reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-text-700 dark:text-text-300 bg-background-200 dark:bg-background-200 rounded-md hover:bg-background-300 dark:hover:bg-background-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createForm.formState.isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 dark:bg-primary-500 rounded-md hover:bg-primary-600 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createForm.formState.isSubmitting
                      ? "Creating..."
                      : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-background-900 dark:bg-background-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-background-100 dark:bg-background-100">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-text-900 dark:text-text-50 mb-4">
                Edit User: {editingUser.username}
              </h3>
              <form
                onSubmit={updateForm.handleSubmit(handleUpdateUser)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-700 dark:text-text-300">
                    Role
                  </label>
                  <select
                    {...updateForm.register("role")}
                    className="mt-1 block w-full border border-background-300 dark:border-background-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {updateForm.formState.errors.role && (
                    <p className="mt-1 text-sm text-red-600">
                      {updateForm.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      updateForm.reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-text-700 dark:text-text-300 bg-background-200 dark:bg-background-200 rounded-md hover:bg-background-300 dark:hover:bg-background-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateForm.formState.isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 dark:bg-primary-500 rounded-md hover:bg-primary-600 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {updateForm.formState.isSubmitting
                      ? "Updating..."
                      : "Update User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
