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
  // Get projectId with fallback - all hooks must be called unconditionally
  const projectId = (params && params.projectId ? String(params.projectId) : null) || "";
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
    dispatch(fetchProjectById({ id: projectId }));
    dispatch(fetchCollections({ projectId }));
  }, [dispatch, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setStats((prev) => ({ ...prev, collections: collections.length }));
  }, [collections]);

  // Early return after all hooks are called
  if (!projectId || projectId === "") {
    return (
      <PageLayout>
        <Alert variant="destructive">
          <AlertDescription>Project ID is required</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  // Show loading skeleton while project or collections are loading
  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader
          title="Loading..."
          description="Loading project details..."
          showBackButton
          backButtonFallback="/projects"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`stat-skeleton-${i}`}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={`nav-skeleton-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!project) {
    return (
      <PageLayout>
        <Alert variant="destructive" data-testid="project-not-found-error">
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
        showBackButton
        backButtonFallback="/projects"
        action={
          <Link href={`/projects/${projectId}/settings`}>
            <ActionButton variant="edit" icon={Edit}>
              Edit Settings
            </ActionButton>
          </Link>
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
            <Link href={`/projects/${projectId}/collections`}>
              <ActionButton variant="outline" icon={Database}>
                Collections <ArrowRight className="ml-2 h-4 w-4" />
              </ActionButton>
            </Link>
            <Link href={`/projects/${projectId}/users`}>
              <ActionButton variant="outline" icon={Users}>
                Users <ArrowRight className="ml-2 h-4 w-4" />
              </ActionButton>
            </Link>
            <Link href={`/projects/${projectId}/email`}>
              <ActionButton variant="outline" icon={Mail}>
                Email <ArrowRight className="ml-2 h-4 w-4" />
              </ActionButton>
            </Link>
            <Link href={`/projects/${projectId}/mcp`}>
              <ActionButton variant="outline" icon={Activity}>
                MCP <ArrowRight className="ml-2 h-4 w-4" />
              </ActionButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
