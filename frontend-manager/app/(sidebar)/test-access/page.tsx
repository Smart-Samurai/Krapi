"use client";

import { type Project } from "@krapi/sdk";
import {
  TestTube2,
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Clock,
  Zap,
  Settings,
  Trash2,
  Plus,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { Scope } from "@/lib/krapi";

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  duration: number;
  error?: string;
}

interface TestSuite {
  suite: string;
  tests: TestResult[];
}

interface HealthCheck {
  healthy: boolean;
  message: string;
  details?: unknown;
  version?: string;
}

interface DiagnosticResult {
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export default function TestAccessPage() {
  const { krapi, user: _user, hasScope } = useReduxAuth();

  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [dbHealthStatus, setDbHealthStatus] = useState<HealthCheck | null>(
    null
  );
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [diagnosticResults, setDiagnosticResults] =
    useState<DiagnosticResult | null>(null);
  const [testProjects, setTestProjects] = useState<Project[]>([]);
  const [running, setRunning] = useState<{
    health: boolean;
    dbHealth: boolean;
    integration: boolean;
    diagnostics: boolean;
    testProject: boolean;
    cleanup: boolean;
  }>({
    health: false,
    dbHealth: false,
    integration: false,
    diagnostics: false,
    testProject: false,
    cleanup: false,
  });

  // Note: These methods will be implemented when available in the SDK
  const checkProjectAccess = async () => {
    // Placeholder for now
  };

  const checkCollectionAccess = async () => {
    if (!krapi) return;

    try {
      // Note: Collection access check requires a project ID
      toast.info("Collection access check requires a project ID");
    } catch {
      // Error logged for debugging
      toast.error("Collection access check failed");
    }
  };

  const checkDocumentAccess = async () => {
    if (!krapi) return;

    try {
      // Note: Document access check requires a project ID and collection ID
      toast.info(
        "Document access check requires a project ID and collection ID"
      );
    } catch {
      // Error logged for debugging
      toast.error("Document access check failed");
    }
  };

  const checkSystemHealth = async () => {
    if (!krapi) return;

    try {
      setRunning((prev) => ({ ...prev, health: true }));
      const response = await krapi.health.check();

      if (response) {
        setHealthStatus(response);
        toast.success("System health check completed");
      } else {
        toast.error("Failed to check system health");
      }
    } catch (error) {
      // Error logged for debugging
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
  };

  const checkDatabaseHealth = async () => {
    if (!krapi || !hasScope(Scope.ADMIN_READ)) return;

    try {
      setRunning((prev) => ({ ...prev, dbHealth: true }));
      const response = await krapi.health.checkDatabase();

      if (response) {
        setDbHealthStatus(response);
        toast.success("Database health check completed");
      } else {
        toast.error("Failed to check database health");
      }
    } catch (error) {
      // Error logged for debugging
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
  };

  // Note: Database repair will be implemented when available in the SDK
  // const repairDatabase = async () => {
  //   if (!krapi || !hasScope(Scope.MASTER)) return;
  //   // Implementation will go here
  // };

  const runDiagnostics = async () => {
    if (!krapi) return;

    try {
      setRunning((prev) => ({ ...prev, diagnostics: true }));
      const response = await krapi.health.runDiagnostics();

      if (response) {
        setDiagnosticResults(response);
        toast.success("System diagnostics completed");
      } else {
        toast.error("Failed to run diagnostics");
      }
    } catch {
      // Error logged for debugging
      toast.error("Diagnostics failed");
    } finally {
      setRunning((prev) => ({ ...prev, diagnostics: false }));
    }
  };

  const runIntegrationTests = async () => {
    if (!krapi) return;

    try {
      setRunning((prev) => ({ ...prev, integration: true }));
      const response = await krapi.testing.runTests();

      if (response) {
        setTestResults(response.results || []);
        toast.success("Integration tests completed");
      } else {
        toast.error("Failed to run integration tests");
      }
    } catch {
      // Error logged for debugging
      toast.error("Integration tests failed");
    } finally {
      setRunning((prev) => ({ ...prev, integration: false }));
    }
  };

  const createTestProject = async () => {
    if (!krapi) return;

    try {
      setRunning((prev) => ({ ...prev, testProject: true }));
      const response = await krapi.testing.createTestProject();

      if (response) {
        toast.success("Test project created successfully");
        // Refresh projects list
        await checkProjectAccess();
      } else {
        toast.error("Failed to create test project");
      }
    } catch {
      // Error logged for debugging
      toast.error("Failed to create test project");
    } finally {
      setRunning((prev) => ({ ...prev, testProject: false }));
    }
  };

  const cleanupTestData = async () => {
    if (!krapi) return;

    try {
      setRunning((prev) => ({ ...prev, cleanup: true }));
      const response = await krapi.testing.cleanup();

      if (response) {
        toast.success("Test data cleanup completed");
        // Refresh data
        await checkProjectAccess();
        await checkCollectionAccess();
        await checkDocumentAccess();
      } else {
        toast.error("Failed to cleanup test data");
      }
    } catch {
      // Error logged for debugging
      toast.error("Test data cleanup failed");
    } finally {
      setRunning((prev) => ({ ...prev, cleanup: false }));
    }
  };

  const loadTestProjects = useCallback(async () => {
    if (!krapi) return;

    try {
      const response = await krapi.projects.getAll();
      if (Array.isArray(response)) {
        // Filter test projects (those with "test" in the name)
        const testProjects = (response as unknown as Project[]).filter(
          (p: Project) =>
            p.name.toLowerCase().includes("test") ||
            p.description?.toLowerCase().includes("test")
        );
        setTestProjects(testProjects as unknown as Project[]);
      }
    } catch {
      // Error logged for debugging
    }
  }, [krapi]);

  useEffect(() => {
    loadTestProjects();
  }, [krapi, loadTestProjects]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getHealthBadge = (healthy: boolean) => {
    return healthy ? (
      <Badge variant="default" className="bg-primary">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Healthy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Unhealthy
      </Badge>
    );
  };

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle2 className="h-4 w-4 text-primary" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Access & System Health</h1>
        <p className="text-muted-foreground">
          Monitor system health, run diagnostics, and manage test data
        </p>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="testing">Integration Tests</TabsTrigger>
          <TabsTrigger value="projects">Test Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Overall system status and connectivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getHealthBadge(healthStatus.healthy)}
                    </div>
                    <div>
                      <span className="text-sm font-medium">Message</span>
                      <p className="text-sm text-muted-foreground">
                        {healthStatus.message}
                      </p>
                    </div>
                    {healthStatus.version && (
                      <div>
                        <span className="text-sm font-medium">Version</span>
                        <p className="text-sm text-muted-foreground">
                          {healthStatus.version}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Check Health&quot; to run system health check
                  </p>
                )}

                <Button
                  onClick={checkSystemHealth}
                  disabled={running.health}
                  className="w-full"
                >
                  {running.health ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Activity className="mr-2 h-4 w-4" />
                      Check Health
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Database Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
                <CardDescription>
                  Database connectivity and integrity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dbHealthStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getHealthBadge(dbHealthStatus.healthy)}
                    </div>
                    <div>
                      <span className="text-sm font-medium">Message</span>
                      <p className="text-sm text-muted-foreground">
                        {dbHealthStatus.message}
                      </p>
                    </div>
                    {(() => {
                      const details = dbHealthStatus.details;
                      if (!details) return null;

                      return (
                        <div>
                          <span className="text-sm font-medium">Details</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {typeof details === "string"
                              ? details
                              : JSON.stringify(details, null, 2)}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasScope(Scope.ADMIN_READ)
                      ? 'Click "Check Database" to run database health check'
                      : "Requires admin read access"}
                  </p>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={checkDatabaseHealth}
                    disabled={running.dbHealth || !hasScope(Scope.ADMIN_READ)}
                    className="w-full"
                  >
                    {running.dbHealth ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Check Database
                      </>
                    )}
                  </Button>

                  {hasScope(Scope.MASTER) && (
                    <Button
                      onClick={() => {
                        // Note: Database repair will be implemented when available in the SDK
                        toast.info(
                          "Repair Database functionality is not yet implemented."
                        );
                      }}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Repair Database
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Diagnostics
              </CardTitle>
              <CardDescription>
                Run comprehensive system diagnostics and tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnosticResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {diagnosticResults.summary.passed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Passed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {diagnosticResults.summary.failed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Failed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {diagnosticResults.summary.total}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  <Progress
                    value={
                      (diagnosticResults.summary.passed /
                        diagnosticResults.summary.total) *
                      100
                    }
                    className="w-full"
                  />

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diagnosticResults.tests.map((test) => (
                        <TableRow
                          key={`test-access-diagnostic-${test.name}`}
                        >
                          <TableCell className="font-medium">
                            {test.name}
                          </TableCell>
                          <TableCell>
                            {getTestStatusIcon(test.passed)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(test.duration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                test.passed
                                  ? "text-primary"
                                  : "text-destructive"
                              }
                            >
                              {test.message ||
                                (test.passed ? "Passed" : "Failed")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No diagnostic results available</p>
                  <p className="text-sm">
                    Run diagnostics to check system health
                  </p>
                </div>
              )}

              <Button
                onClick={runDiagnostics}
                disabled={running.diagnostics}
                className="w-full"
              >
                {running.diagnostics ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run System Diagnostics
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                Integration Tests
              </CardTitle>
              <CardDescription>
                Run comprehensive integration tests across all systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.length > 0 ? (
                <div className="space-y-6">
                  {testResults.map((suite) => (
                    <div
                      key={`test-access-suite-${suite.suite}`}
                      className="space-y-3"
                    >
                      <h4 className="font-semibold text-lg">{suite.suite}</h4>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Test</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Result</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suite.tests.map((test) => (
                            <TableRow
                              key={`test-access-test-${suite.suite}-${test.name}`}
                            >
                              <TableCell className="font-medium">
                                {test.name}
                              </TableCell>
                              <TableCell>
                                {getTestStatusIcon(test.passed)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(test.duration)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {test.passed ? (
                                  <span className="text-primary">Passed</span>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-red-600">Failed</span>
                                    {test.error && (
                                      <p className="text-xs text-muted-foreground">
                                        {test.error}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {suiteIndex < testResults.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No test results available</p>
                  <p className="text-sm">
                    Run integration tests to verify system functionality
                  </p>
                </div>
              )}

              <Button
                onClick={runIntegrationTests}
                disabled={running.integration}
                className="w-full"
              >
                {running.integration ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Integration Tests
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Test Projects
              </CardTitle>
              <CardDescription>
                Create and manage test projects with sample data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={createTestProject}
                  disabled={running.testProject}
                  className="flex-1"
                >
                  {running.testProject ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Test Project
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => cleanupTestData()}
                  variant="destructive"
                  disabled={testProjects.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cleanup All
                </Button>
              </div>

              {testProjects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell>
                          {new Date(project.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.is_active ? "default" : "secondary"
                            }
                          >
                            {project.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cleanupTestData()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No test projects found</p>
                  <p className="text-sm">
                    Create test projects to experiment with features
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Testing and diagnostic features require
          appropriate permissions. Health checks are available to all users,
          while database operations require admin access.
        </AlertDescription>
      </Alert>
    </div>
  );
}
