"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiagnosticsCardProps {
  diagnosticResults?: Record<string, unknown>;
  running?: boolean;
  onRunDiagnostics?: () => void;
}

export function DiagnosticsCard({ diagnosticResults, running, onRunDiagnostics }: DiagnosticsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        {diagnosticResults ? (
          <pre className="text-sm">{JSON.stringify(diagnosticResults, null, 2)}</pre>
        ) : (
          <p className="text-muted-foreground">No diagnostics run yet</p>
        )}
        {onRunDiagnostics ? <button onClick={onRunDiagnostics} disabled={running}>
            {running ? "Running..." : "Run Diagnostics"}
          </button> : null}
      </CardContent>
    </Card>
  );
}

