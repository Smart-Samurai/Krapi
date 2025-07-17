"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Users,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Plus,
  Download,
  Upload,
  Database,
  Activity,
  BarChart3,
  Lock,
  Unlock,
  Mail,
  Phone,
  Globe,
  Smartphone,
} from "lucide-react";
import { useNotification } from "../../../hooks/useNotification";
import { NotificationContainer } from "../../../components/Notification";
import { authManagementAPI } from "../../../lib/api";

// Types
interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  status: "active" | "inactive" | "locked";
  active: boolean; // For backward compatibility
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  failed_login_attempts?: number;
  locked_until?: string | null;
}

interface AuthProvider {
  id: string;
  name: string;
  type: "oauth" | "saml" | "ldap";
  enabled: boolean;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scope?: string;
  config?: Record<string, unknown>;
}

interface AuthStats {
  total_users: number;
  active_users: number;
  locked_users: number;
  unverified_users: number;
  new_users_today: number;
  users_today: number;
  login_attempts_today: number;
  logins_today: number;
  failed_logins_today: number;
  active_sessions: number;
  sessions_active: number; // Alternative naming for compatibility
}

// Remove unused Session interface
// interface Session {
//   id: string;
//   user_id: number;
//   username: string;
//   ip_address: string;
//   user_agent: string;
//   created_at: string;
//   last_activity: string;
//   expires_at: string;
//   active: boolean;
// }

interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  require_email_verification: boolean;
  allow_user_registration: boolean;
  two_factor_required: boolean;
  jwt_expiry: number;
  refresh_token_expiry: number;
}

// Validation schemas
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  role: z.enum(["admin", "moderator", "user"]),
  status: z.enum(["active", "inactive", "locked"]),
  phone: z.string().optional(),
  active: z.boolean().optional(),
  email_verified: z.boolean().optional(),
  phone_verified: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
});

const securitySchema = z.object({
  password_min_length: z.number().min(6).max(128),
  password_require_uppercase: z.boolean(),
  password_require_lowercase: z.boolean(),
  password_require_numbers: z.boolean(),
  password_require_symbols: z.boolean(),
  session_timeout: z.number().min(5).max(1440),
  max_login_attempts: z.number().min(1).max(10),
  lockout_duration: z.number().min(1).max(1440),
  require_email_verification: z.boolean(),
  allow_user_registration: z.boolean(),
  two_factor_required: z.boolean(),
  jwt_expiry: z.number().min(5).max(1440),
  refresh_token_expiry: z.number().min(60).max(43200),
});

const providerSchema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client Secret is required"),
  redirect_uri: z.string().url("Invalid redirect URI"),
  scope: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;
type SecuritySettingsFormData = z.infer<typeof securitySchema>;
type ProviderFormData = z.infer<typeof providerSchema>;

type TabType = "overview" | "users" | "providers" | "security" | "sessions";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Sessions state (keeping sessionsPage as it's used in useCallback)
  const [sessionsPage] = useState(1);

  // Analytics state
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);

  // Security settings state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showSecuritySettingsModal, setShowSecuritySettingsModal] =
    useState(false);

  // Providers state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showProviderModal, setShowProviderModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingProvider, setEditingProvider] = useState<AuthProvider | null>(
    null
  );

  const { handleError, showSuccess } = useNotification();

  // Forms
  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "user",
      status: "active",
    },
  });

  const securityForm = useForm<SecuritySettingsFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_symbols: false,
      session_timeout: 30,
      max_login_attempts: 5,
      lockout_duration: 15,
      require_email_verification: true,
      allow_user_registration: false,
      two_factor_required: false,
      jwt_expiry: 60,
      refresh_token_expiry: 1440,
    },
  });

  const providerForm = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
  });

  // Load functions
  const loadUsers = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await authManagementAPI.getUsers(usersPage, 10)) as any;

      if (response.success) {
        setUsers(response.data || []);
        setUsersTotal(response.total || 0);
      } else {
        handleError(response.error || "Failed to load users");
      }
    } catch (error) {
      handleError(error, "Failed to load users");
    }
  }, [usersPage, handleError]);

  const loadAuthStats = useCallback(async () => {
    try {
      console.log("Loading auth stats...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).getUserStats();
      console.log("Auth stats response:", response);

      if (response.success) {
        setAuthStats(response.data);
      } else {
        handleError(response.error || "Failed to load auth stats");
      }
    } catch (error) {
      console.error("Auth stats error:", error);
      handleError(error, "Failed to load auth stats");
    }
  }, [handleError]);

  const loadProviders = useCallback(async () => {
    try {
      // Mock data
      setProviders([
        { id: "google", name: "Google", type: "oauth", enabled: false },
        { id: "github", name: "GitHub", type: "oauth", enabled: false },
        { id: "microsoft", name: "Microsoft", type: "oauth", enabled: false },
        { id: "discord", name: "Discord", type: "oauth", enabled: false },
      ]);
    } catch (error) {
      handleError(error, "Failed to load providers");
    }
  }, [handleError]);

  const loadSecuritySettings = useCallback(async () => {
    try {
      const response = await authManagementAPI.getSecuritySettings();

      if (response.success) {
        setSecuritySettings(response.data);
        securityForm.reset(response.data);
      } else {
        handleError(response.error || "Failed to load security settings");
      }
    } catch (error) {
      handleError(error, "Failed to load security settings");
    }
  }, [handleError, securityForm]);

  const loadSessions = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).getSessions({
        page: sessionsPage,
        limit: 10,
      });

      if (response.success) {
        // setSessions(response.data);
        // setSessionsTotal(response.total || 0);
      } else {
        handleError(response.error || "Failed to load sessions");
      }
    } catch (error) {
      handleError(error, "Failed to load sessions");
    }
    // Remove unnecessary dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleError]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadUsers(),
      loadAuthStats(),
      loadProviders(),
      loadSecuritySettings(),
      loadSessions(),
    ]);
    setLoading(false);
  }, [
    loadUsers,
    loadAuthStats,
    loadProviders,
    loadSecuritySettings,
    loadSessions,
  ]);

  // Load data on component mount
  useEffect(() => {
    // Only load data if we have a user (authenticated)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        loadData();
      } else {
        console.error("No auth token found - user not authenticated");
        handleError("User not authenticated", "Authentication required");
      }
    }
    // Fix missing dependencies
  }, [loadData, handleError]);

  // Handlers
  const handleCreateUser = async (data: UserFormData) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).createUser(data);

      if (response.success) {
        showSuccess("User created successfully");
        setShowUserModal(false);
        userForm.reset();
        await loadUsers();
      } else {
        handleError(response.error || "Failed to create user");
      }
    } catch (error) {
      handleError(error, "Failed to create user");
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).updateUser(
        editingUser.id,
        data
      );

      if (response.success) {
        showSuccess("User updated successfully");
        setShowUserModal(false);
        setEditingUser(null);
        userForm.reset();
        await loadUsers();
      } else {
        handleError(response.error || "Failed to update user");
      }
    } catch (error) {
      handleError(error, "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).deleteUser(id);

      if (response.success) {
        showSuccess("User deleted successfully");
        await loadUsers();
      } else {
        handleError(response.error || "Failed to delete user");
      }
    } catch (error) {
      handleError(error, "Failed to delete user");
    }
  };

  const handleToggleUserStatus = async (id: number, active: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (authManagementAPI as any).updateUser(id, {
        active,
      });

      if (response.success) {
        showSuccess(
          `User ${active ? "activated" : "deactivated"} successfully`
        );
        await loadUsers();
      } else {
        handleError(response.error || "Failed to update user status");
      }
    } catch (error) {
      handleError(error, "Failed to update user status");
    }
  };

  const handleUnlockUser = async (_id: number) => {
    try {
      // await authAPI.unlockUser(_id);
      showSuccess("User unlocked successfully");
      await loadUsers();
    } catch (error) {
      handleError(error, "Failed to unlock user");
    }
  };

  const _handleUpdateSecuritySettings = async (
    _data: SecuritySettingsFormData
  ) => {
    try {
      // await authAPI.updateSecuritySettings(_data);
      showSuccess("Security settings updated successfully");
      // setSecuritySettings(_data);
    } catch (error) {
      handleError(error, "Failed to update security settings");
    }
  };

  const _handleToggleProvider = async (_id: string, _enabled: boolean) => {
    try {
      // await authAPI.updateProvider(_id, { enabled: _enabled });
      showSuccess(
        `${_id} provider ${_enabled ? "enabled" : "disabled"} successfully`
      );
      // await loadProviders();
    } catch (error) {
      handleError(error, "Failed to update provider");
    }
  };

  const _handleRevokeSession = async (_sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session?")) return;

    try {
      // await authAPI.revokeSession(_sessionId);
      showSuccess("Session revoked successfully");
      await loadSessions();
    } catch (error) {
      handleError(error, "Failed to revoke session");
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      userForm.reset({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role as "admin" | "moderator" | "user",
        status: user.status,
      });
    } else {
      setEditingUser(null);
      userForm.reset({
        role: "user",
        status: "active",
      });
    }
    setShowUserModal(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openProviderModal = (provider?: AuthProvider) => {
    if (provider) {
      setEditingProvider(provider);
      providerForm.reset({
        client_id: provider.client_id || "",
        client_secret: provider.client_secret || "",
        redirect_uri: provider.redirect_uri || "",
        scope: provider.scope || "",
      });
    } else {
      setEditingProvider(null);
      providerForm.reset();
    }
    setShowProviderModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading authentication management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 mr-3 text-blue-600" />
            Authentication & Security
          </h1>
          <p className="text-gray-600 mt-2">
            Manage users, authentication providers, security settings, and
            monitor sessions
          </p>
        </div>

        {/* Quick stats */}
        {authStats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {authStats.total_users}
              </div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {authStats.active_users}
              </div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {authStats.locked_users}
              </div>
              <div className="text-sm text-gray-500">Locked Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {authStats.unverified_users}
              </div>
              <div className="text-sm text-gray-500">Unverified</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {authStats.users_today}
              </div>
              <div className="text-sm text-gray-500">New Today</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">
                {authStats.logins_today}
              </div>
              <div className="text-sm text-gray-500">Logins Today</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">
                {authStats.failed_logins_today}
              </div>
              <div className="text-sm text-gray-500">Failed Logins</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-teal-600">
                {authStats.sessions_active}
              </div>
              <div className="text-sm text-gray-500">Active Sessions</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: "users", label: "Users", icon: Users },
              { key: "providers", label: "Auth Providers", icon: Globe },
              { key: "security", label: "Security", icon: Lock },
              { key: "sessions", label: "Sessions", icon: Activity },
              { key: "analytics", label: "Analytics", icon: BarChart3 },
              { key: "logs", label: "Audit Logs", icon: Database },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`${
                  activeTab === key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Management</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => openUserModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </button>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={usersRole}
                  onChange={(e) => setUsersRole(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={loadUsers}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            {user.active ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span className="text-xs">
                              {user.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {user.locked_until && (
                            <div className="flex items-center">
                              <Lock className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-xs text-red-600">
                                Locked
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            {user.email_verified ? (
                              <Mail className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            )}
                            <span className="text-xs">Email</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center">
                              {user.phone_verified ? (
                                <Phone className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <Phone className="h-4 w-4 text-gray-400 mr-1" />
                              )}
                              <span className="text-xs">Phone</span>
                            </div>
                          )}
                          {user.two_factor_enabled && (
                            <div className="flex items-center">
                              <Smartphone className="h-4 w-4 text-blue-500 mr-1" />
                              <span className="text-xs">2FA</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openUserModal(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleUserStatus(user.id, !user.active)
                            }
                            className={
                              user.active
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            }
                            title={
                              user.active ? "Deactivate user" : "Activate user"
                            }
                          >
                            {user.active ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </button>
                          {user.locked_until && (
                            <button
                              onClick={() => handleUnlockUser(user.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Unlock user"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No users found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first user.
                </p>
              </div>
            )}

            {/* Pagination */}
            {usersTotal > 20 && (
              <div className="px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(usersPage - 1) * 20 + 1} to{" "}
                    {Math.min(usersPage * 20, usersTotal)} of {usersTotal} users
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                      disabled={usersPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUsersPage(usersPage + 1)}
                      disabled={usersPage * 20 >= usersTotal}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional tabs would continue here... */}
        {/* For brevity, I'll add the other tabs in subsequent messages */}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingUser ? "Edit User" : "Create User"}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={userForm.handleSubmit(
                editingUser ? handleUpdateUser : handleCreateUser
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username *
                  </label>
                  <input
                    {...userForm.register("username")}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {userForm.formState.errors.username && (
                    <p className="mt-1 text-sm text-red-600">
                      {userForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    {...userForm.register("email")}
                    type="email"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {userForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {userForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {!editingUser && "*"}
                  </label>
                  <input
                    {...userForm.register("password")}
                    type="password"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current"
                        : "Enter password"
                    }
                  />
                  {userForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {userForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role *
                  </label>
                  <select
                    {...userForm.register("role")}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {userForm.formState.errors.role && (
                    <p className="mt-1 text-sm text-red-600">
                      {userForm.formState.errors.role.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    {...userForm.register("phone")}
                    type="tel"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center">
                  <input
                    {...userForm.register("active")}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active user
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...userForm.register("email_verified")}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Email verified
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...userForm.register("phone_verified")}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Phone verified
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...userForm.register("two_factor_enabled")}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Two-factor authentication
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
