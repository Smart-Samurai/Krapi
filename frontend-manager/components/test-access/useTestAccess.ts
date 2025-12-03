/**
 * Test Access Hook
 *
 * Custom hook for managing test access page state and operations.
 *
 * @module components/test-access/useTestAccess
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import type {
  HealthCheck,
  DiagnosticResult,
  TestSuite,
  TestProject,
  RunningState,
} from "./types";

import { useReduxAuth } from "@/contexts/redux-auth-context";
import { Scope } from "@/lib/krapi-constants";

/**
 * Test Access Hook Return Type
 */
export interface UseTestAccessReturn {
  // Auth
  sessionToken: string | null;
  hasScope: (scope: string) => boolean;

  // State
  healthStatus: HealthCheck | null;
  dbHealthStatus: HealthCheck | null;
  testResults: TestSuite[];
  diagnosticResults: DiagnosticResult | null;
  testProjects: TestProject[];
  running: RunningState;

  // Actions
  checkSystemHealth: () => Promise<void>;
  checkDatabaseHealth: () => Promise<void>;
  runDiagnostics: () => Promise<void>;
  runIntegrationTests: () => Promise<void>;
  createTestProject: () => Promise<void>;
  deleteTestProject: (projectId: string) => Promise<void>;
  cleanupTestData: () => Promise<void>;
  loadTestProjects: () => Promise<void>;
}

/**
 * Custom hook for test access page logic
 */
export function useTestAccess(): UseTestAccessReturn {
  const { sessionToken, hasScope } = useReduxAuth();

  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [dbHealthStatus, setDbHealthStatus] = useState<HealthCheck | null>(null);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult | null>(null);
  const [testProjects, setTestProjects] = useState<TestProject[]>([]);
  const [running, setRunning] = useState<RunningState>({
    health: false,
    dbHealth: false,
    integration: false,
    diagnostics: false,
    testProject: false,
    cleanup: false,
  });

  /**
   * Check system health
   */
  const checkSystemHealth = useCallback(async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, health: true }));
      const response = await fetch("/api/health/check", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Health check failed");
      }

      const result = await response.json();

      if (result) {
        setHealthStatus(result);
        toast.success("System health check completed");
      } else {
        toast.error("Failed to check system health");
      }
    } catch (error) {
      setHealthStatus({
        healthy: false,
        message: "Health check failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      toast.error("Health check failed");
    } finally {
      setRunning((prev) => ({ ...prev, health: false }));
    }
  }, [sessionToken]);

  /**
   * Check database health
   */
  const checkDatabaseHealth = useCallback(async () => {
    if (!sessionToken || !hasScope(Scope.ADMIN_READ)) return;

    try {
      setRunning((prev) => ({ ...prev, dbHealth: true }));
      const response = await fetch("/api/health/database", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Database health check failed");
      }

      const result = await response.json();

      if (result) {
        setDbHealthStatus(result);
        toast.success("Database health check completed");
      } else {
        toast.error("Failed to check database health");
      }
    } catch (error) {
      setDbHealthStatus({
        healthy: false,
        message: "Database health check failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      toast.error("Database health check failed");
    } finally {
      setRunning((prev) => ({ ...prev, dbHealth: false }));
    }
  }, [sessionToken, hasScope]);

  /**
   * Run diagnostics
   */
  const runDiagnostics = useCallback(async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, diagnostics: true }));
      const response = await fetch("/api/health/diagnostics", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Diagnostics failed");
      }

      const result = await response.json();

      if (result) {
        setDiagnosticResults(result);
        toast.success("System diagnostics completed");
      } else {
        toast.error("Failed to run diagnostics");
      }
    } catch {
      toast.error("Diagnostics failed");
    } finally {
      setRunning((prev) => ({ ...prev, diagnostics: false }));
    }
  }, [sessionToken]);

  /**
   * Run integration tests
   */
  const runIntegrationTests = useCallback(async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, integration: true }));
      const response = await fetch("/api/testing/run-tests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Integration tests failed");
      }

      const result = await response.json();

      if (result) {
        setTestResults(result.results || []);
        toast.success("Integration tests completed");
      } else {
        toast.error("Failed to run integration tests");
      }
    } catch {
      toast.error("Integration tests failed");
    } finally {
      setRunning((prev) => ({ ...prev, integration: false }));
    }
  }, [sessionToken]);

  /**
   * Load test projects
   */
  const loadTestProjects = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const response = await fetch("/api/projects", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      const projects = result.projects || result.data || [];

      if (Array.isArray(projects)) {
        const testProjects = projects.filter((p: TestProject) => {
          const settings = p.settings as { isTestProject?: boolean } | undefined;
          return (
            settings?.isTestProject === true ||
            p.name.toLowerCase().includes("test") ||
            p.description?.toLowerCase().includes("test")
          );
        });
        setTestProjects(testProjects);
      }
    } catch {
      // Failed to load test projects
    }
  }, [sessionToken]);

  /**
   * Create test project
   */
  const createTestProject = useCallback(async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, testProject: true }));
      const response = await fetch("/api/testing/create-project", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create test project");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Test project created successfully");
        await loadTestProjects();
      } else {
        toast.error(result.error || "Failed to create test project");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to create test project: ${errorMessage}`);
    } finally {
      setRunning((prev) => ({ ...prev, testProject: false }));
    }
  }, [sessionToken, loadTestProjects]);

  /**
   * Delete test project
   */
  const deleteTestProject = useCallback(async (projectId: string) => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, cleanup: true }));
      const response = await fetch(`/api/testing/project/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete test project");
      }

      toast.success("Test project deleted successfully");
      await loadTestProjects();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete test project: ${errorMessage}`);
    } finally {
      setRunning((prev) => ({ ...prev, cleanup: false }));
    }
  }, [sessionToken, loadTestProjects]);

  /**
   * Cleanup test data
   */
  const cleanupTestData = useCallback(async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    try {
      setRunning((prev) => ({ ...prev, cleanup: true }));
      const response = await fetch("/api/testing/cleanup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to cleanup test data");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Test data cleanup completed");
        await loadTestProjects();
      } else {
        toast.error(result.error || "Failed to cleanup test data");
      }
    } catch {
      toast.error("Test data cleanup failed");
    } finally {
      setRunning((prev) => ({ ...prev, cleanup: false }));
    }
  }, [sessionToken, loadTestProjects]);

  // Load test projects on mount
  useEffect(() => {
    loadTestProjects();
  }, [loadTestProjects]);

  return {
    sessionToken,
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
  };
}

export default useTestAccess;

