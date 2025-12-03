/**
 * Integration Tests Card Component
 *
 * Displays integration test results and controls.
 *
 * @module components/test-access/IntegrationTestsCard
 */
"use client";

import {
  TestTube2,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
} from "lucide-react";
import React from "react";

import type { TestSuite } from "./types";

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

interface IntegrationTestsCardProps {
  testResults: TestSuite[];
  running: boolean;
  onRunTests: () => void;
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Integration Tests Card Component
 *
 * Displays integration test results with summary and detailed results.
 */
export function IntegrationTestsCard({
  testResults,
  running,
  onRunTests,
}: IntegrationTestsCardProps) {
  // Calculate totals
  const totalTests = testResults.reduce(
    (acc, suite) => acc + suite.tests.length,
    0
  );
  const passedTests = testResults.reduce(
    (acc, suite) => acc + suite.tests.filter((t) => t.passed).length,
    0
  );
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5" />
              Integration Tests
            </CardTitle>
            <CardDescription>
              Run automated integration tests
            </CardDescription>
          </div>
          <Button onClick={onRunTests} disabled={running}>
            <Play className={`h-4 w-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running ? "Running..." : "Run Tests"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {testResults.length > 0 ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{totalTests}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 text-center">
                <p className="text-2xl font-bold text-green-500">{passedTests}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 text-center">
                <p className="text-2xl font-bold text-red-500">{failedTests}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>

            {/* Test Suites */}
            {testResults.map((suite) => (
              <div key={suite.suite} className="space-y-2">
                <Separator />
                <h4 className="font-medium">{suite.suite}</h4>
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
                    {suite.tests.map((test) => (
                      <TableRow key={test.name}>
                        <TableCell className="font-medium">{test.name}</TableCell>
                        <TableCell>
                          {test.passed ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDuration(test.duration)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {test.message || test.error || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No test results yet</p>
            <p className="text-sm">Run integration tests to see results</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntegrationTestsCard;

