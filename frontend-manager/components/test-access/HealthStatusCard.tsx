/**
 * Health Status Card Component
 *
 * Displays system and database health status with refresh capability.
 *
 * @module components/test-access/HealthStatusCard
 */
"use client";

import {
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import React from "react";

import type { HealthCheck } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthStatusCardProps {
  healthStatus: HealthCheck | null;
  dbHealthStatus: HealthCheck | null;
  running: { health: boolean; dbHealth: boolean };
  onCheckHealth: () => void;
  onCheckDbHealth: () => void;
}

/**
 * Get status icon based on health status
 */
function getStatusIcon(status: HealthCheck | null, isLoading: boolean) {
  if (isLoading) {
    return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!status) {
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
  return status.healthy ? (
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  ) : (
    <XCircle className="h-5 w-5 text-red-500" />
  );
}

/**
 * Get status badge based on health status
 */
function getStatusBadge(status: HealthCheck | null, isLoading: boolean) {
  if (isLoading) {
    return <Badge variant="secondary">Checking...</Badge>;
  }
  if (!status) {
    return <Badge variant="outline">Not checked</Badge>;
  }
  return status.healthy ? (
    <Badge className="bg-green-500">Healthy</Badge>
  ) : (
    <Badge variant="destructive">Unhealthy</Badge>
  );
}

/**
 * Health Status Card Component
 *
 * Displays system and database health status.
 */
export function HealthStatusCard({
  healthStatus,
  dbHealthStatus,
  running,
  onCheckHealth,
  onCheckDbHealth,
}: HealthStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Check the health status of various system components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Health */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {getStatusIcon(healthStatus, running.health)}
            <div>
              <p className="font-medium">API Health</p>
              <p className="text-sm text-muted-foreground">
                {healthStatus?.message || "Check system health status"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(healthStatus, running.health)}
            <Button
              size="sm"
              variant="outline"
              onClick={onCheckHealth}
              disabled={running.health}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${running.health ? "animate-spin" : ""}`}
              />
              Check
            </Button>
          </div>
        </div>

        {/* Database Health */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {getStatusIcon(dbHealthStatus, running.dbHealth)}
            <div>
              <p className="font-medium">Database Health</p>
              <p className="text-sm text-muted-foreground">
                {dbHealthStatus?.message || "Check database connectivity"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(dbHealthStatus, running.dbHealth)}
            <Button
              size="sm"
              variant="outline"
              onClick={onCheckDbHealth}
              disabled={running.dbHealth}
            >
              <Database
                className={`h-4 w-4 mr-1 ${running.dbHealth ? "animate-spin" : ""}`}
              />
              Check
            </Button>
          </div>
        </div>

        {/* Version Info */}
        {healthStatus?.version && (
          <div className="text-sm text-muted-foreground text-center pt-2">
            System Version: {healthStatus.version}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HealthStatusCard;

