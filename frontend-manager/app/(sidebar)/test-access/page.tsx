"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { Project, Scope } from "@/lib/krapi";

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
  details?: any;
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
  const { krapi, user, hasScope } = useAuth();
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [dbHealthStatus, setDbHealthStatus] = useState<HealthCheck | null>(null);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult | null>(null);
  const [testProjects, setTestProjects] = useState<Project[]>([]);
  const [running, setRunning] = useState<{
    health: boolean;
    dbHealth: boolean;
    integration: boolean;
    diagnostics: boolean;
    creating: boolean;
  }>({
    health: false,
    dbHealth: false,
    integration: false,
    diagnostics: false,
    creating: false,
  });

  const checkSystemHealth = async () => {
    if (!krapi) return;

    try {
      setRunning(prev => ({ ...prev, health: true }));
      const response = await krapi.health.check();
      
      if (response.success && response.data) {
        setHealthStatus(response.data);
        toast.success("System health check completed");
      } else {
        toast.error("Failed to check system health");
      }
    } catch (error) {
      console.error("Error checking system health:", error);
      setHealthStatus({
        healthy: false,
        message: "Health check failed",
        details: { error: (error as Error).message }
      });
      toast.error("Health check failed");
    } finally {
      setRunning(prev => ({ ...prev, health: false }));
    }
  };

  const checkDatabaseHealth = async () => {
    if (!krapi || !hasScope(Scope.ADMIN_READ)) return;

    try {
      setRunning(prev => ({ ...prev, dbHealth: true }));
      const response = await krapi.health.checkDatabase();
      
      if (response.success && response.data) {
        setDbHealthStatus(response.data);
        toast.success("Database health check completed");
      } else {
        toast.error("Failed to check database health");
      }
    } catch (error) {
      console.error("Error checking database health:", error);
      setDbHealthStatus({
        healthy: false,
        message: "Database health check failed",
        details: { error: (error as Error).message }
      });
      toast.error("Database health check failed");
    } finally {
      setRunning(prev => ({ ...prev, dbHealth: false }));
    }
  };

  const repairDatabase = async () => {
    if (!krapi || !hasScope(Scope.MASTER)) return;

    try {
      const response = await krapi.health.repairDatabase();
      
      if (response.success && response.data) {
        toast.success(`Database repair completed: ${response.data.message}`);
        // Refresh database health after repair
        await checkDatabaseHealth();
      } else {
        toast.error("Failed to repair database");
      }
    } catch (error) {
      console.error("Error repairing database:", error);
      toast.error("Database repair failed");
    }
  };

  const runDiagnostics = async () => {
    if (!krapi) return;

    try {
      setRunning(prev => ({ ...prev, diagnostics: true }));
      const response = await krapi.health.runDiagnostics();
      
      if (response.success && response.data) {
        setDiagnosticResults(response.data);
        toast.success("System diagnostics completed");
      } else {
        toast.error("Failed to run diagnostics");
      }
    } catch (error) {
      console.error("Error running diagnostics:", error);
      toast.error("Diagnostics failed");
    } finally {
      setRunning(prev => ({ ...prev, diagnostics: false }));
    }
  };

  const runIntegrationTests = async () => {
    if (!krapi) return;

    try {
      setRunning(prev => ({ ...prev, integration: true }));
      const response = await krapi.testing.runIntegrationTests();
      
      if (response.success && response.data) {
        setTestResults(response.data.results);
        toast.success("Integration tests completed");
      } else {
        toast.error("Failed to run integration tests");
      }
    } catch (error) {
      console.error("Error running integration tests:", error);
      toast.error("Integration tests failed");
    } finally {
      setRunning(prev => ({ ...prev, integration: false }));
    }
  };

  const createTestProject = async () => {
    if (!krapi) return;

    try {
      setRunning(prev => ({ ...prev, creating: true }));
      const response = await krapi.testing.createTestProject({
        name: `Test Project ${Date.now()}`,
        withCollections: true,
        withDocuments: true,
        documentCount: 10,
      });
      
      if (response.success && response.data) {
        setTestProjects(prev => [...prev, response.data!]);
        toast.success("Test project created successfully");
      } else {
        toast.error("Failed to create test project");
      }
    } catch (error) {
      console.error("Error creating test project:", error);
      toast.error("Failed to create test project");
    } finally {
      setRunning(prev => ({ ...prev, creating: false }));
    }
  };

  const cleanupTestData = async (projectId?: string) => {
    if (!krapi) return;

    try {
      const response = await krapi.testing.cleanup(projectId);
      
      if (response.success && response.data) {
        const { deleted } = response.data;
        toast.success(
          `Cleanup completed: ${deleted.projects} projects, ${deleted.collections} collections, ${deleted.documents} documents deleted`
        );
        
        if (projectId) {
          setTestProjects(prev => prev.filter(p => p.id !== projectId));
        } else {
          setTestProjects([]);
        }
      } else {
        toast.error("Failed to cleanup test data");
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
      toast.error("Cleanup failed");
    }
  };

  const loadTestProjects = async () => {
    if (!krapi) return;

    try {
      const response = await krapi.projects.getAll();
      if (response.success && response.data) {
        // Filter test projects (those with "test" in the name)
        const testProjects = response.data.filter(p => 
          p.name.toLowerCase().includes('test') || 
          p.description?.toLowerCase().includes('test')
        );
        setTestProjects(testProjects);
      }
    } catch (error) {
      console.error("Error loading test projects:", error);
    }
  };

  useEffect(() => {
    loadTestProjects();
  }, [krapi]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getHealthBadge = (healthy: boolean) => {
    return healthy ? (
      <Badge variant="default" className="bg-green-600">
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
      <CheckCircle2 className="h-4 w-4 text-green-600" />
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
                    Click "Check Health" to run system health check
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
                    {dbHealthStatus.details && (
                      <div>
                        <span className="text-sm font-medium">Details</span>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(dbHealthStatus.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasScope(Scope.ADMIN_READ) 
                      ? "Click \"Check Database\" to run database health check"
                      : "Requires admin read access"
                    }
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
                      onClick={repairDatabase}
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
                      <div className="text-2xl font-bold text-green-600">
                        {diagnosticResults.summary.passed}
                      </div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {diagnosticResults.summary.failed}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {diagnosticResults.summary.total}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  <Progress 
                    value={(diagnosticResults.summary.passed / diagnosticResults.summary.total) * 100}
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
                      {diagnosticResults.tests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{test.name}</TableCell>
                          <TableCell>{getTestStatusIcon(test.passed)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(test.duration)}
                            </div>
                          </TableCell>
                                                     <TableCell>
                             <span className={test.passed ? "text-green-600" : "text-red-600"}>
                               {test.message || (test.passed ? "Passed" : "Failed")}
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
                  <p className="text-sm">Run diagnostics to check system health</p>
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
                  {testResults.map((suite, suiteIndex) => (
                    <div key={suiteIndex} className="space-y-3">
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
                          {suite.tests.map((test, testIndex) => (
                            <TableRow key={testIndex}>
                              <TableCell className="font-medium">{test.name}</TableCell>
                              <TableCell>{getTestStatusIcon(test.passed)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(test.duration)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {test.passed ? (
                                  <span className="text-green-600">Passed</span>
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
                  <p className="text-sm">Run integration tests to verify system functionality</p>
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
                  disabled={running.creating}
                  className="flex-1"
                >
                  {running.creating ? (
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
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          {new Date(project.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={project.active ? "default" : "secondary"}>
                            {project.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cleanupTestData(project.id)}
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
                  <p className="text-sm">Create test projects to experiment with features</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Testing and diagnostic features require appropriate permissions. 
          Health checks are available to all users, while database operations require admin access.
        </AlertDescription>
      </Alert>
    </div>
  );
}
