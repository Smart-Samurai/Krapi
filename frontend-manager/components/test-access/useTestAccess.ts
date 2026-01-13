import { useState, useCallback } from "react";

import { useReduxAuth } from "@/contexts/redux-auth-context";

export function useTestAccess() {
  const { hasScope } = useReduxAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, unknown> | null>(null);
  const [dbHealthStatus, setDbHealthStatus] = useState<Record<string, unknown> | null>(null);
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, unknown> | null>(null);
  const [testProjects, setTestProjects] = useState<Array<Record<string, unknown>>>([]);
  const [running, setRunning] = useState<{
    health?: boolean;
    dbHealth?: boolean;
    diagnostics?: boolean;
    integration?: boolean;
    testProject?: boolean;
    cleanup?: boolean;
  }>({});

  const checkSystemHealth = useCallback(async () => {
    setRunning((prev) => ({ ...prev, health: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/health");
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check system health");
    } finally {
      setRunning((prev) => ({ ...prev, health: false }));
    }
  }, []);

  const checkDatabaseHealth = useCallback(async () => {
    setRunning((prev) => ({ ...prev, dbHealth: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/health/database");
      const data = await response.json();
      setDbHealthStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check database health");
    } finally {
      setRunning((prev) => ({ ...prev, dbHealth: false }));
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setRunning((prev) => ({ ...prev, diagnostics: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/system/diagnostics");
      const data = await response.json();
      setDiagnosticResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run diagnostics");
    } finally {
      setRunning((prev) => ({ ...prev, diagnostics: false }));
    }
  }, []);

  const loadTestProjects = useCallback(async () => {
    setLoading(true);
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/testing/projects");
      const data = await response.json();
      setTestProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test projects");
    } finally {
      setLoading(false);
    }
  }, []);

  const runIntegrationTests = useCallback(async () => {
    setRunning((prev) => ({ ...prev, integration: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/testing/integration");
      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run integration tests");
    } finally {
      setRunning((prev) => ({ ...prev, integration: false }));
    }
  }, []);

  const createTestProject = useCallback(async () => {
    setRunning((prev) => ({ ...prev, testProject: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      const response = await fetch("/api/client/krapi/k1/testing/create-project", {
        method: "POST",
      });
      const data = await response.json();
      await loadTestProjects();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test project");
    } finally {
      setRunning((prev) => ({ ...prev, testProject: false }));
    }
  }, [loadTestProjects]);

  const deleteTestProject = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      await fetch(`/api/client/krapi/k1/testing/projects/${projectId}`, {
        method: "DELETE",
      });
      await loadTestProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test project");
    } finally {
      setLoading(false);
    }
  }, [loadTestProjects]);

  const cleanupTestData = useCallback(async () => {
    setRunning((prev) => ({ ...prev, cleanup: true }));
    try {
      // SDK-FIRST: Call frontend API route which uses SDK
      await fetch("/api/client/krapi/k1/testing/cleanup", {
        method: "POST",
      });
      await loadTestProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cleanup test data");
    } finally {
      setRunning((prev) => ({ ...prev, cleanup: false }));
    }
  }, [loadTestProjects]);

  return {
    loading,
    error,
    hasScope,
    healthStatus,
    dbHealthStatus,
    testResults,
    diagnosticResults,
    testProjects,
    running,
    checkSystemHealth,
    checkDatabaseHealth,
    runDiagnostics,
    runIntegrationTests,
    createTestProject,
    deleteTestProject,
    cleanupTestData,
    loadTestProjects,
    setLoading,
    setError,
  };
}
