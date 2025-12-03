/**
 * Admin Users Component Types
 *
 * Shared types for admin-users page components.
 *
 * @module components/admin-users/types
 */

import { z } from "zod";

/**
 * Permission types for admin users
 */
export interface AdminPermissions {
  // System-wide permissions
  canManageUsers: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  canManageSystemSettings: boolean;
  canViewSystemLogs: boolean;
  canManageBackups: boolean;

  // Project-specific permissions
  canAccessAllProjects: boolean;
  restrictedProjectIds?: string[];

  // Feature-specific permissions
  canManageDatabase: boolean;
  canManageAPI: boolean;
  canManageFiles: boolean;
  canManageAuth: boolean;

  // Administrative permissions
  canCreateAdminAccounts: boolean;
  canModifyOtherAdmins: boolean;
  isMasterAdmin: boolean;
}

/**
 * Admin user type
 */
export type AdminRole = "master_admin" | "admin" | "project_admin" | "limited_admin";
export type AdminStatus = "active" | "inactive" | "suspended";

/**
 * Local Admin User Interface
 *
 * @interface LocalAdminUser
 */
export interface LocalAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: AdminPermissions;
  lastActive: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Admin User Schema
 */
export const adminUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["master_admin", "admin", "project_admin", "limited_admin"]),
    accessLevel: z.enum(["full", "read_write", "read_only"]),
    permissions: z.object({
      canManageUsers: z.boolean(),
      canCreateProjects: z.boolean(),
      canDeleteProjects: z.boolean(),
      canManageSystemSettings: z.boolean(),
      canViewSystemLogs: z.boolean(),
      canManageBackups: z.boolean(),
      canAccessAllProjects: z.boolean(),
      canManageDatabase: z.boolean(),
      canManageAPI: z.boolean(),
      canManageFiles: z.boolean(),
      canManageAuth: z.boolean(),
      canCreateAdminAccounts: z.boolean(),
      canModifyOtherAdmins: z.boolean(),
      isMasterAdmin: z.boolean(),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type AdminUserFormData = z.infer<typeof adminUserSchema>;

/**
 * Default permissions based on role
 */
export function getDefaultPermissionsForRole(role: AdminRole): AdminPermissions {
  switch (role) {
    case "master_admin":
      return {
        canManageUsers: true,
        canCreateProjects: true,
        canDeleteProjects: true,
        canManageSystemSettings: true,
        canViewSystemLogs: true,
        canManageBackups: true,
        canAccessAllProjects: true,
        canManageDatabase: true,
        canManageAPI: true,
        canManageFiles: true,
        canManageAuth: true,
        canCreateAdminAccounts: true,
        canModifyOtherAdmins: true,
        isMasterAdmin: true,
      };
    case "admin":
      return {
        canManageUsers: true,
        canCreateProjects: true,
        canDeleteProjects: true,
        canManageSystemSettings: false,
        canViewSystemLogs: true,
        canManageBackups: true,
        canAccessAllProjects: true,
        canManageDatabase: true,
        canManageAPI: true,
        canManageFiles: true,
        canManageAuth: true,
        canCreateAdminAccounts: false,
        canModifyOtherAdmins: false,
        isMasterAdmin: false,
      };
    case "project_admin":
      return {
        canManageUsers: false,
        canCreateProjects: true,
        canDeleteProjects: false,
        canManageSystemSettings: false,
        canViewSystemLogs: false,
        canManageBackups: false,
        canAccessAllProjects: false,
        canManageDatabase: false,
        canManageAPI: true,
        canManageFiles: true,
        canManageAuth: false,
        canCreateAdminAccounts: false,
        canModifyOtherAdmins: false,
        isMasterAdmin: false,
      };
    case "limited_admin":
    default:
      return {
        canManageUsers: false,
        canCreateProjects: false,
        canDeleteProjects: false,
        canManageSystemSettings: false,
        canViewSystemLogs: false,
        canManageBackups: false,
        canAccessAllProjects: false,
        canManageDatabase: false,
        canManageAPI: false,
        canManageFiles: false,
        canManageAuth: false,
        canCreateAdminAccounts: false,
        canModifyOtherAdmins: false,
        isMasterAdmin: false,
      };
  }
}

