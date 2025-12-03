/**
 * Test Access Page
 *
 * Page for testing system access, health checks, and diagnostics.
 * Provides test suite execution and diagnostic information.
 *
 * @module app/(sidebar)/test-access/page
 * @example
 * // Automatically rendered at /test-access route
 */
"use client";

import {
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

import { PageLayout, PageHeader } from "@/components/common";
import {
  DiagnosticsCard,
  IntegrationTestsCard,
  TestProjectsCard,
  useTestAccess,
} from "@/components/test-access";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scope } from "@/lib/krapi-constants";

/**
 * Get health badge based on status
 */
function getHealthBadge(healthy: boolean) {
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
}

/**
 * Test Access Page Component
 *
 * Provides testing utilities and health checks for system diagnostics.
 *
 * @returns {JSX.Element} Test access page
 */
export default function TestAccessPage() {
  const {
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
  } = useTestAccess();

  return (
    <PageLayout>
      <PageHeader
        title="Test Access & System Health"
        description="Monitor system health, run diagnostics, and manage test data"
      />

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="testing">Integration Tests</TabsTrigger>
          <TabsTrigger value="projects">Test Projects</TabsTrigger>
        </TabsList>

        {/* Health Checks Tab */}
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
                      <span className="text-base font-medium">Message</span>
                      <p className="text-base text-muted-foreground">
                        {healthStatus.message}
                      </p>
                    </div>
                    {healthStatus.version && (
                      <div>
                        <span className="text-base font-medium">Version</span>
                        <p className="text-base text-muted-foreground">
                          {healthStatus.version}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground">
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
                      <span className="text-base font-medium">Message</span>
                      <p className="text-base text-muted-foreground">
                        {dbHealthStatus.message}
                      </p>
                    </div>
                    {(() => {
                      const details = dbHealthStatus.details;
                      if (!details) return null;
                      return (
                        <div>
                          <span className="text-base font-medium">Details</span>
                          <pre className="text-base bg-muted p-2 rounded mt-1 overflow-auto">
                            {typeof details === "string"
                              ? details
                              : JSON.stringify(details, null, 2)}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground">
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

          {/* Cleanup Actions */}
          {hasScope(Scope.MASTER) && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Clean up all test data (projects, collections, documents)
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cleanupTestData}
                  disabled={running.cleanup}
                >
                  {running.cleanup ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cleanup All Test Data
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <DiagnosticsCard
            diagnosticResults={diagnosticResults}
            running={running.diagnostics}
            onRunDiagnostics={runDiagnostics}
          />
        </TabsContent>

        {/* Integration Tests Tab */}
        <TabsContent value="testing" className="space-y-4">
          <IntegrationTestsCard
            testResults={testResults}
            running={running.integration}
            onRunTests={runIntegrationTests}
          />
        </TabsContent>

        {/* Test Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <TestProjectsCard
            testProjects={testProjects}
            running={{
              testProject: running.testProject,
              cleanup: running.cleanup,
            }}
            onCreateProject={createTestProject}
            onDeleteProject={deleteTestProject}
            onRefresh={loadTestProjects}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
