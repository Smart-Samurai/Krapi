/**
 * Test Projects Card Component
 *
 * Manages test projects - create, list, and delete.
 *
 * @module components/test-access/TestProjectsCard
 */
"use client";

import { Settings, Trash2, Plus, RefreshCw } from "lucide-react";
import React from "react";

import type { TestProject } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TestProjectsCardProps {
  testProjects: TestProject[];
  running: { testProject: boolean; cleanup: boolean };
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onRefresh: () => void;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Test Projects Card Component
 *
 * Displays and manages test projects.
 */
export function TestProjectsCard({
  testProjects,
  running,
  onCreateProject,
  onDeleteProject,
  onRefresh,
}: TestProjectsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Test Projects
            </CardTitle>
            <CardDescription>
              Manage test projects for integration testing
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={running.testProject}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${running.testProject ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={onCreateProject}
              disabled={running.testProject}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Test Project
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {testProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No test projects found</p>
            <p className="text-sm">
              Create a test project to run integration tests
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={project.is_active ? "default" : "secondary"}
                    >
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(project.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteProject(project.id)}
                      disabled={running.cleanup}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default TestProjectsCard;

