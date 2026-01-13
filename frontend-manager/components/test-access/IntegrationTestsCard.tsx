"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IntegrationTestsCardProps {
  testResults?: Record<string, unknown>;
  running?: boolean;
  onRunTests?: () => void;
}

export function IntegrationTestsCard({ testResults, running, onRunTests }: IntegrationTestsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Tests</CardTitle>
      </CardHeader>
      <CardContent>
        {testResults ? (
          <pre className="text-sm">{JSON.stringify(testResults, null, 2)}</pre>
        ) : (
          <p className="text-muted-foreground">No tests run yet</p>
        )}
        {onRunTests ? <button onClick={onRunTests} disabled={running}>
            {running ? "Running..." : "Run Tests"}
          </button> : null}
      </CardContent>
    </Card>
  );
}

