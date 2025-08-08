"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Project } from "@/lib/krapi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Users,
  FileText,
  Settings,
  Activity,
  Calendar,
  Globe,
  ArrowRight,
  Edit,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjectById } from "@/store/projectsSlice";
import { fetchCollections } from "@/store/collectionsSlice";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const dispatch = useAppDispatch();

  const projectsState = useAppSelector((s) => s.projects);
  const project = projectsState.items.find((p) => p.id === projectId) || null;
  const collectionsBucket = useAppSelector((s) => s.collections.byProjectId[projectId]);
  const collections = collectionsBucket?.items || [];
  const isLoading = projectsState.loading || collectionsBucket?.loading || false;

  const [error, setError] = useState<string | null>(null);
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

  if (isLoading && !project) {
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

  if (!project) {
    return (
      <Alert>
        <AlertDescription>Project not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Project overview and quick actions</p>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/settings`}>
            <Edit className="mr-2 h-4 w-4" /> Edit Settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections}</div>
            <p className="text-xs text-muted-foreground">Total collections</p>
          </CardContent>
        </Card>
        {/* Other stat cards unchanged or can be wired similarly when backend supports */}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Manage project resources</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/collections`}>
                <Database className="mr-2 h-4 w-4" /> Collections <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/documents`}>
                <FileText className="mr-2 h-4 w-4" /> Documents <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/users`}>
                <Users className="mr-2 h-4 w-4" /> Users <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/files`}>
                <FileText className="mr-2 h-4 w-4" /> Files <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/email`}>
                <Mail className="mr-2 h-4 w-4" /> Email <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/mcp`}>
                <Activity className="mr-2 h-4 w-4" /> MCP <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
