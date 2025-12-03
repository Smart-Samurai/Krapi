/**
 * Settings Hook
 *
 * Custom hook for managing system settings page state and operations.
 *
 * @module components/settings/useSettings
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import {
  defaultSettings,
  type SystemSettings,
  type GeneralSettingsData,
  type SecuritySettingsData,
  type EmailSettingsData,
  type DatabaseSettingsData,
} from "./types";

import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Settings Hook Return Type
 */
export interface UseSettingsReturn {
  // State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  settings: SystemSettings | null;
  testEmailDialog: boolean;
  setTestEmailDialog: (open: boolean) => void;
  testEmail: string;
  setTestEmail: (email: string) => void;

  // Actions
  handleGeneralSubmit: (data: GeneralSettingsData) => Promise<void>;
  handleSecuritySubmit: (data: SecuritySettingsData) => Promise<void>;
  handleEmailSubmit: (data: EmailSettingsData) => Promise<void>;
  handleDatabaseSubmit: (data: DatabaseSettingsData) => Promise<void>;
  handleTestEmail: () => Promise<void>;
}

/**
 * Custom hook for settings page logic
 */
export function useSettings(): UseSettingsReturn {
  const { sessionToken } = useReduxAuth();

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Fetch settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/system/settings", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const result = await response.json();
        if (result.success && result.data) {
          setSettings(result.data as SystemSettings);
        } else {
          setSettings(defaultSettings);
        }
      } catch {
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [sessionToken]);

  /**
   * Handle general settings submit
   */
  const handleGeneralSubmit = useCallback(
    async (data: GeneralSettingsData) => {
      if (!sessionToken) {
        toast.error("No session token available");
        return;
      }

      try {
        setIsSaving(true);
        const response = await fetch("/api/system/settings", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ general: data }),
        });

        if (!response.ok) {
          throw new Error("Failed to save settings");
        }

        const result = await response.json();
        if (result.success) {
          setSettings((prev) => (prev ? { ...prev, general: data } : null));
          toast.success("General settings saved successfully!");
        } else {
          toast.error(result.error || "Failed to save settings");
        }
      } catch {
        toast.error("Failed to save settings. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  /**
   * Handle security settings submit
   */
  const handleSecuritySubmit = useCallback(
    async (data: SecuritySettingsData) => {
      if (!sessionToken) {
        toast.error("No session token available");
        return;
      }

      try {
        setIsSaving(true);
        const response = await fetch("/api/system/settings", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ security: data }),
        });

        if (!response.ok) {
          throw new Error("Failed to save settings");
        }

        const result = await response.json();
        if (result.success) {
          setSettings((prev) => (prev ? { ...prev, security: data } : null));
          toast.success("Security settings saved successfully!");
        } else {
          toast.error(result.error || "Failed to save settings");
        }
      } catch {
        toast.error("Failed to save settings. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  /**
   * Handle email settings submit
   */
  const handleEmailSubmit = useCallback(
    async (data: EmailSettingsData) => {
      if (!sessionToken) {
        toast.error("No session token available");
        return;
      }

      try {
        setIsSaving(true);
        const response = await fetch("/api/system/settings", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: data }),
        });

        if (!response.ok) {
          throw new Error("Failed to save settings");
        }

        const result = await response.json();
        if (result.success) {
          setSettings((prev) => (prev ? { ...prev, email: data } : null));
          toast.success("Email settings saved successfully!");
        } else {
          toast.error(result.error || "Failed to save settings");
        }
      } catch {
        toast.error("Failed to save settings. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  /**
   * Handle database settings submit
   */
  const handleDatabaseSubmit = useCallback(
    async (data: DatabaseSettingsData) => {
      if (!sessionToken) {
        toast.error("No session token available");
        return;
      }

      try {
        setIsSaving(true);
        const response = await fetch("/api/system/settings", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ database: data }),
        });

        if (!response.ok) {
          throw new Error("Failed to save settings");
        }

        const result = await response.json();
        if (result.success) {
          setSettings((prev) => (prev ? { ...prev, database: data } : null));
          toast.success("Database settings saved successfully!");
        } else {
          toast.error(result.error || "Failed to save settings");
        }
      } catch {
        toast.error("Failed to save settings. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  /**
   * Handle test email
   */
  const handleTestEmail = useCallback(async () => {
    if (!sessionToken || !testEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: testEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test email");
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Test email sent successfully!");
        setTestEmailDialog(false);
        setTestEmail("");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch {
      toast.error("Failed to send test email. Please check your email settings.");
    } finally {
      setIsSaving(false);
    }
  }, [sessionToken, testEmail]);

  return {
    activeTab,
    setActiveTab,
    isLoading,
    isSaving,
    settings,
    testEmailDialog,
    setTestEmailDialog,
    testEmail,
    setTestEmail,
    handleGeneralSubmit,
    handleSecuritySubmit,
    handleEmailSubmit,
    handleDatabaseSubmit,
    handleTestEmail,
  };
}

export default useSettings;

