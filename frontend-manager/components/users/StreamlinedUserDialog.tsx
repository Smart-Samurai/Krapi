"use client";
/* eslint-disable no-console */

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { adminUserSchema } from "@/components/admin-users";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ExtendedAdminUser } from "@/lib/types/extended";

interface StreamlinedUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  editUser?: ExtendedAdminUser;
  "data-testid"?: string;
}

type FormData = z.infer<typeof adminUserSchema>;

export function StreamlinedUserDialog({
  open,
  onOpenChange,
  onSuccess,
  editUser,
  "data-testid": testId,
}: StreamlinedUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormData>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: editUser
      ? {
          username: editUser.username,
          email: editUser.email || "",
          role: editUser.role as "master_admin" | "admin" | "developer",
          access_level: editUser.access_level as "full" | "read_write" | "read_only",
          active: editUser.active,
        }
      : {
          username: "",
          email: "",
          role: "admin" as "master_admin" | "admin" | "developer",
          access_level: "full" as "full" | "read_write" | "read_only",
          active: true,
        },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // SDK-FIRST: All API calls must go through frontend API routes which use SDK
      const endpoint = editUser
        ? `/api/client/krapi/k1/admin/users/${editUser.id}`
        : "/api/client/krapi/k1/admin/users";
      const method = editUser ? "PUT" : "POST";

      // Get auth token from localStorage
      const token = localStorage.getItem("session_token");
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save user" }));
        throw new Error(errorData.error || `Failed to save user: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save user");
      }

      // Wait for onSuccess callback to complete (e.g., list refresh)
      await onSuccess?.();
      onOpenChange(false);
      form.reset();
      setError(null);
    } catch (error) {
      console.error("Error saving user:", error);
      setError(error instanceof Error ? error.message : "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{editUser ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {editUser
              ? "Update user information"
              : "Create a new admin user"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <Alert variant="destructive" data-testid="admin-user-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              data-testid={editUser ? "admin-user-edit-form-username" : "admin-user-form-username"}
              {...form.register("username")}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid={editUser ? "admin-user-edit-form-email" : "admin-user-form-email"}
              {...form.register("email")}
            />
          </div>
          {!editUser && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="admin-user-form-password"
                {...form.register("password")}
              />
            </div>
          )}
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(value) => form.setValue("role", value as "master_admin" | "admin" | "developer")}
            >
              <SelectTrigger data-testid={editUser ? "admin-user-edit-form-role" : "admin-user-form-role"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master_admin">Master Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="access_level">Access Level</Label>
            <Select
              value={form.watch("access_level")}
              onValueChange={(value) => form.setValue("access_level", value as "full" | "read_write" | "read_only")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="read_write">Read/Write</SelectItem>
                <SelectItem value="read_only">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid={editUser ? "admin-user-edit-form-submit" : "create-admin-user-dialog-submit"}
            >
              {isSubmitting ? "Saving..." : editUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

