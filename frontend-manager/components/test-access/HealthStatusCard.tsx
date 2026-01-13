"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthStatusCardProps {
  healthStatus?: Record<string, unknown>;
  dbHealthStatus?: Record<string, unknown>;
  onCheckSystem?: () => void;
  onCheckDatabase?: () => void;
  loading?: boolean;
}

export function HealthStatusCard({
  healthStatus,
  dbHealthStatus,
  onCheckSystem,
  onCheckDatabase,
  loading,
}: HealthStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">System Health</h3>
            {healthStatus ? (
              <pre className="text-sm">{JSON.stringify(healthStatus, null, 2)}</pre>
            ) : (
              <p className="text-muted-foreground">Not checked</p>
            )}
            {onCheckSystem ? <button onClick={onCheckSystem} disabled={loading}>
                Check System
              </button> : null}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Database Health</h3>
            {dbHealthStatus ? (
              <pre className="text-sm">{JSON.stringify(dbHealthStatus, null, 2)}</pre>
            ) : (
              <p className="text-muted-foreground">Not checked</p>
            )}
            {onCheckDatabase ? <button onClick={onCheckDatabase} disabled={loading}>
                Check Database
              </button> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

