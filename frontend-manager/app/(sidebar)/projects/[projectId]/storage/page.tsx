/**
 * Storage Page
 * 
 * Page displaying storage statistics and usage for a project.
 * 
 * @module app/(sidebar)/projects/[projectId]/storage/page
 * @example
 * // Automatically rendered at /projects/[projectId]/storage route
 */
/**
 * Storage Page
 * 
 * Page for managing project storage with statistics and quota management.
 * Displays storage usage, file statistics, and quota information.
 * 
 * @module app/(sidebar)/projects/[projectId]/storage/page
 * @example
 * // Automatically rendered at /projects/[projectId]/storage route
 */
"use client";

import {
  Database,
  HardDrive,
  Upload,
  FileText,
  Activity,
  Info,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useKrapi } from "@/lib/hooks/useKrapi";

/**
 * Storage Statistics Interface
 * 
 * @interface StorageStats
 * @property {number} total_files - Total number of files
 * @property {number} total_size_bytes - Total storage size in bytes
 * @property {Record<string, number>} files_by_type - File count by MIME type
 * @property {Object} storage_quota - Storage quota information
 * @property {number} storage_quota.used - Used storage in bytes
 * @property {number} storage_quota.limit - Storage limit in bytes
 * @property {number} storage_quota.percentage - Storage usage percentage
 */
interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  files_by_type: Record<string, number>;
  storage_quota: {
    used: number;
    limit: number;
    percentage: number;
  };
}

/**
 * Format file size in bytes to human-readable string
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Storage Page Component
 * 
 * Displays storage statistics and usage information for a project.
 * 
 * @returns {JSX.Element} Storage page
 */
export default function StoragePage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const krapi = useKrapi();

  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorageStats = useCallback(async () => {
    if (!krapi) return;

    try {
      setLoading(true);
      setError(null);
      const response = await krapi.storage.getStatistics(projectId);
      setStorageStats(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load storage statistics"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, krapi]);

  useEffect(() => {
    loadStorageStats();
  }, [loadStorageStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">Storage Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage your project&apos;s storage usage
          </p>
        </div>
        <Button onClick={loadStorageStats}>
          <Activity className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Storage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {storageStats
                ? formatFileSize(storageStats.total_size_bytes)
                : "0 B"}
            </div>
            <p className="text-base text-muted-foreground">
              Current storage used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Storage Limit</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {storageStats
                ? formatFileSize(storageStats.storage_quota.limit)
                : "0 B"}
            </div>
            <p className="text-base text-muted-foreground">Maximum allowed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Usage Percentage
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {storageStats
                ? Math.round(storageStats.storage_quota.percentage)
                : 0}
              %
            </div>
            <p className="text-base text-muted-foreground">Of total limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">File Count</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">
              {storageStats ? storageStats.total_files : 0}
            </div>
            <p className="text-base text-muted-foreground">Total files stored</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage Progress */}
      {storageStats && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>
              Visual representation of your storage consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-base">
              <span>Used: {formatFileSize(storageStats.total_size_bytes)}</span>
              <span>
                Available:{" "}
                {formatFileSize(
                  storageStats.storage_quota.limit -
                    storageStats.total_size_bytes
                )}
              </span>
            </div>
            <Progress
              value={storageStats.storage_quota.percentage}
              className="w-full"
            />
            <div className="flex items-center justify-between text-base text-muted-foreground">
              <span>0%</span>
              <span>{Math.round(storageStats.storage_quota.percentage)}%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your storage resources</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="outline" asChild>
            <a href={`/projects/${projectId}/files`}>
              <FileText className="mr-2 h-4 w-4" /> Manage Files
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/projects/${projectId}/files`}>
              <Upload className="mr-2 h-4 w-4" /> Upload Files
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Storage Features</h4>
              <ul className="space-y-1 text-base text-muted-foreground">
                <li>• Secure file storage with encryption</li>
                <li>• Automatic backup and redundancy</li>
                <li>• CDN integration for fast delivery</li>
                <li>• File versioning and history</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Usage Guidelines</h4>
              <ul className="space-y-1 text-base text-muted-foreground">
                <li>• Monitor usage regularly</li>
                <li>• Clean up unused files</li>
                <li>• Use appropriate file formats</li>
                <li>• Contact support for limit increases</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
