/**
 * Admin Users Stats Component
 *
 * Displays statistics about admin users.
 *
 * @module components/admin-users/AdminUsersStats
 */
"use client";

import { Shield, UserCheck, UserX } from "lucide-react";
import React from "react";

import type { LocalAdminUser } from "./types";

interface AdminUsersStatsProps {
  adminUsers: LocalAdminUser[];
  isLoading: boolean;
}

/**
 * Admin Users Stats Component
 *
 * Displays admin user statistics in a grid layout.
 */
export function AdminUsersStats({
  adminUsers,
  isLoading,
}: AdminUsersStatsProps) {
  const totalAdmins = adminUsers.length;
  const activeAdmins = adminUsers.filter((u) => u.status === "active").length;
  const masterAdmins = adminUsers.filter((u) => u.role === "master_admin").length;
  const inactiveAdmins = adminUsers.filter((u) => u.status !== "active").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-background border border-secondary p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-text/60">Total Admins</p>
            <p className="text-base font-bold text-text mt-1">
              {isLoading ? "..." : totalAdmins}
            </p>
          </div>
          <div className="p-3 bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
      <div className="bg-background border border-secondary p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-text/60">Active Admins</p>
            <p className="text-base font-bold text-text mt-1">
              {isLoading ? "..." : activeAdmins}
            </p>
          </div>
          <div className="p-3 bg-primary/10 dark:bg-primary/20">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
      <div className="bg-background border border-secondary p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-text/60">Master Admins</p>
            <p className="text-base font-bold text-text mt-1">
              {isLoading ? "..." : masterAdmins}
            </p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/20">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>
      <div className="bg-background border border-secondary p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-text/60">
              Inactive/Suspended
            </p>
            <p className="text-base font-bold text-text mt-1">
              {isLoading ? "..." : inactiveAdmins}
            </p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20">
            <UserX className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersStats;

