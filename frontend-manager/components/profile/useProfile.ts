/**
 * Profile Hook
 *
 * Custom hook for managing user profile page state and operations.
 *
 * @module components/profile/useProfile
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Profile Hook Return Type
 */
export interface UseProfileReturn {
  // Password state
  currentPassword: string;
  setCurrentPassword: (password: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  showPasswords: {
    current: boolean;
    new: boolean;
    confirm: boolean;
  };
  setShowPasswords: React.Dispatch<
    React.SetStateAction<{
      current: boolean;
      new: boolean;
      confirm: boolean;
    }>
  >;
  isChangingPassword: boolean;

  // API Key state
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  isRegeneratingKey: boolean;
  isCreatingMasterKey: boolean;

  // Actions
  handlePasswordChange: () => Promise<void>;
  handleRegenerateApiKey: () => Promise<void>;
  handleCreateMasterApiKey: () => Promise<void>;
  getInitials: () => string;
}

/**
 * Custom hook for profile page logic
 */
export function useProfile(): UseProfileReturn {
  const { user, sessionToken } = useReduxAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // API Key state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [isCreatingMasterKey, setIsCreatingMasterKey] = useState(false);

  /**
   * Get user initials
   */
  const getInitials = () => {
    if (!user) return "U";
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * Handle API key regeneration
   */
  const handleRegenerateApiKey = async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to regenerate your API key? This will invalidate your current key."
      )
    ) {
      return;
    }

    setIsRegeneratingKey(true);
    try {
      const response = await fetch("/api/krapi/k1/apikeys/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        toast.success("API key regenerated successfully");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to regenerate API key");
      }
    } catch (error) {
      toast.error(
        `Failed to regenerate API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  /**
   * Handle master API key creation
   */
  const handleCreateMasterApiKey = async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to create a master API key? This will give full access to the entire system."
      )
    ) {
      return;
    }

    setIsCreatingMasterKey(true);
    try {
      const response = await fetch(`/api/krapi/k1/admin/master-api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: "Master API Key for Debugging",
          scopes: ["master"],
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        toast.success("Master API key created successfully");
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to create master API key");
      }
    } catch (error) {
      toast.error(
        `Failed to create master API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreatingMasterKey(false);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswords,
    setShowPasswords,
    isChangingPassword,
    showApiKey,
    setShowApiKey,
    isRegeneratingKey,
    isCreatingMasterKey,
    handlePasswordChange,
    handleRegenerateApiKey,
    handleCreateMasterApiKey,
    getInitials,
  };
}

export default useProfile;

