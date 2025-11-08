/**
 * Project Detail Page
 * 
 * Overview page for a specific project showing statistics and quick navigation.
 * 
 * @module app/(sidebar)/projects/[projectId]/page
 * @example
 * // Automatically rendered at /projects/[projectId] route
 */
/**
 * Project Detail Page
 * 
 * Displays project overview with statistics and quick navigation.
 * 
 * @module app/(sidebar)/projects/[projectId]/page
 * @example
 * // Automatically rendered at /projects/[projectId] route
 */
"use client";

import {
  Database,
  Users,
  FileText,
  Activity,
  ArrowRight,
  Edit,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
  PageLayout,
  PageHeader,
  ActionButton,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { fetchCollections } from "@/store/collectionsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjectById } from "@/store/projectsSlice";

/**
 * Project Detail Page Component
 * 
 * Displays project overview with statistics and navigation cards.
 * 
 * @returns {JSX.Element} Project detail page
 */
/**
 * Project Detail Page Component
 * 
 * Displays project overview with statistics, collections count, and navigation cards.
 * 
 * @returns {JSX.Element} Project detail page
 */
export default function ProjectDetailPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const dispatch = useAppDispatch();

  const projectsState = useAppSelector((s) => s.projects);
  const project = projectsState.items.find((p) => p.id === projectId) || null;
  const collectionsBucket = useAppSelector(
    (s) => s.collections.byProjectId[projectId]
  );
  const collections = useMemo(
    () => collectionsBucket?.items || [],
    [collectionsBucket?.items]
  );
  const isLoading =
    projectsState.loading || collectionsBucket?.loading || false;

  const [stats, setStats] = useState({
    collections: 0,
    documents: 0,
    users: 0,
    files: 0,
  });

  const loadData = useCallback(() => {
    dispatch(fetchProjectById({ id: projectId, krapi }));
    dispatch(fetchCollections({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setStats((prev) => ({ ...prev, collections: collections.length }));
  }, [collections]);

  if (isLoading && !project) {
    return (
      <PageLayout>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageLayout>
    );
  }

  if (!project) {
    return (
      <PageLayout>
        <Alert>
          <AlertDescription>Project not found</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={project.name}
        description="Project overview and quick actions"
        action={
          <ActionButton variant="edit" icon={Edit} asChild>
            <Link href={`/projects/${projectId}/settings`}>
              Edit Settings
            </Link>
          </ActionButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Collections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold">{stats.collections}</div>
            <p className="text-base text-muted-foreground">Total collections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
            <CardDescription className="text-base">
              Manage project resources
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton variant="outline" icon={Database} asChild>
              <Link href={`/projects/${projectId}/collections`}>
                Collections <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
            <ActionButton variant="outline" icon={FileText} asChild>
              <Link href={`/projects/${projectId}/documents`}>
                Documents <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
            <ActionButton variant="outline" icon={Users} asChild>
              <Link href={`/projects/${projectId}/users`}>
                Users <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
            <ActionButton variant="outline" icon={FileText} asChild>
              <Link href={`/projects/${projectId}/files`}>
                Files <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
            <ActionButton variant="outline" icon={Mail} asChild>
              <Link href={`/projects/${projectId}/email`}>
                Email <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
            <ActionButton variant="outline" icon={Activity} asChild>
              <Link href={`/projects/${projectId}/mcp`}>
                MCP <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
