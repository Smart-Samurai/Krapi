"use client";

import React from "react";

import { ExtendedAdminUser } from "@/lib/types/extended";

interface AdminUsersListProps {
  users: ExtendedAdminUser[];
  isLoading?: boolean;
  hasScope?: (scope: string) => boolean;
  onViewUser?: (user: ExtendedAdminUser) => void;
  onEditUser?: (user: ExtendedAdminUser) => void;
  onDelete?: (user: ExtendedAdminUser) => void;
  onDeleteUser?: (user: ExtendedAdminUser) => void;
  onToggleStatus?: (user: ExtendedAdminUser) => void;
}

export function AdminUsersList({
  users,
  isLoading = false,
  hasScope: _hasScope,
  onViewUser,
  onEditUser,
  onDelete,
  onDeleteUser,
  onToggleStatus,
}: AdminUsersListProps) {
  const handleDelete = onDeleteUser || onDelete;
  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (users.length === 0) {
    return (
      <div data-testid="admin-users-empty-state" className="p-8 text-center text-text/60">
        No admin users found
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-users-table">
      {users.map((user) => (
        <div 
          key={user.id} 
          className="border rounded p-4 cursor-pointer hover:bg-secondary/50"
          data-testid={`admin-user-row-${user.username}`}
          onClick={() => {
            if (onViewUser) {
              onViewUser(user);
            } else if (onEditUser) {
              onEditUser(user);
            }
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{user.username}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex gap-2">
              {onViewUser ? <button onClick={(e) => { e.stopPropagation(); onViewUser(user); }}>View</button> : null}
              {onEditUser ? (
                <button 
                  onClick={() => onEditUser(user)}
                  data-testid={`admin-user-edit-button-${user.username}`}
                >
                  Edit
                </button>
              ) : null}
              {onToggleStatus ? <button onClick={() => onToggleStatus(user)}>
                  {user.active ? "Deactivate" : "Activate"}
                </button> : null}
              {handleDelete ? (
                <button 
                  onClick={() => handleDelete(user)}
                  data-testid={`admin-user-delete-button-${user.username}`}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

