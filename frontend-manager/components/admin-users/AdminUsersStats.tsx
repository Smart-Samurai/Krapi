"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtendedAdminUser } from "@/lib/types/extended";

interface AdminUsersStatsProps {
  adminUsers?: ExtendedAdminUser[];
  isLoading?: boolean;
}

export function AdminUsersStats({ adminUsers = [], isLoading: _isLoading = false }: AdminUsersStatsProps) {
  const total = adminUsers.length;
  const active = adminUsers.filter((u: ExtendedAdminUser) => u.active).length;
  const inactive = total - active;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{active}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Inactive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactive}</div>
        </CardContent>
      </Card>
    </div>
  );
}

