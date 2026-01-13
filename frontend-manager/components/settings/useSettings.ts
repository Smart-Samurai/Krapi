import { useState, useCallback, useEffect } from "react";
import { z } from "zod";

import { generalSettingsSchema, securitySettingsSchema, emailSettingsSchema, databaseSettingsSchema } from "./types";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_token" && value) return value;
  }
  return localStorage.getItem("session_token");
}

interface Settings {
  general: z.infer<typeof generalSettingsSchema>;
  security: z.infer<typeof securitySettingsSchema>;
  email: z.infer<typeof emailSettingsSchema>;
  database: z.infer<typeof databaseSettingsSchema>;
}

export function useSettings() {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);

  const isLoading = loading;

  const handleGeneralSubmit = useCallback(async (data: z.infer<typeof generalSettingsSchema>) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/client/krapi/k1/system/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ general: data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev) => prev ? { ...prev, general: data } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleSecuritySubmit = useCallback(async (data: z.infer<typeof securitySettingsSchema>) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/client/krapi/k1/system/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ security: data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev) => prev ? { ...prev, security: data } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleEmailSubmit = useCallback(async (data: z.infer<typeof emailSettingsSchema>) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/client/krapi/k1/system/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev) => prev ? { ...prev, email: data } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleDatabaseSubmit = useCallback(async (data: z.infer<typeof databaseSettingsSchema>) => {
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/client/krapi/k1/system/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ database: data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(errorData.error || `Failed to save settings: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev) => prev ? { ...prev, database: data } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleTestEmail = useCallback(async () => {
    if (!testEmail) return;
    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/client/krapi/k1/system/email/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: testEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to send test email" }));
        throw new Error(errorData.error || `Failed to send test email: ${response.status}`);
      }

      setTestEmailDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setIsSaving(false);
    }
  }, [testEmail]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/client/krapi/k1/system/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to load settings" }));
          throw new Error(errorData.error || `Failed to load settings: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          setSettings({
            general: (result.data.general || {}) as z.infer<typeof generalSettingsSchema>,
            security: (result.data.security || {}) as z.infer<typeof securitySettingsSchema>,
            email: (result.data.email || {}) as z.infer<typeof emailSettingsSchema>,
            database: (result.data.database || {}) as z.infer<typeof databaseSettingsSchema>,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    loading,
    isLoading,
    isSaving,
    error,
    activeTab,
    setActiveTab,
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
    setLoading,
    setError,
  };
}
