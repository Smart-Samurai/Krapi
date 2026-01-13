"use client";

import { useState, useEffect, useCallback } from "react";

import type { ApiKey } from "../types";
import { getAuthToken, normalizeApiKey } from "../utils";

export function useApiKeys(projectId: string) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    // Don't fetch if projectId is invalid
    if (!projectId || projectId === "" || projectId === "placeholder") {
      setIsLoading(false);
      setApiKeys([]);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/api-keys`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to fetch API keys: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = typeof errorData.error === "string"
            ? errorData.error
            : errorMessage;
        } catch {
          // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const normalizedKeys = result.data.map((key: unknown) =>
          normalizeApiKey(key, projectId)
        );
        setApiKeys(normalizedKeys);
      } else if (result.success && result.data === null) {
        setApiKeys([]);
      } else {
        const errorMsg = typeof result.error === "string"
          ? result.error
          : "Invalid response format";
        setError(errorMsg);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while loading API keys";
      setError(errorMessage);
      // eslint-disable-next-line no-console
      console.error("Error loading API keys:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  return {
    apiKeys,
    isLoading,
    error,
    reload: loadApiKeys,
    setError,
  };
}

