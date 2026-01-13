"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TestProjectsCardProps {
  testProjects?: Array<Record<string, unknown>>;
  running?: {
    testProject?: boolean;
    cleanup?: boolean;
  };
  onCreateProject?: () => void;
  onDeleteProject?: (id: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function TestProjectsCard({
  testProjects = [],
  running,
  onCreateProject,
  onDeleteProject,
  onRefresh,
  loading,
}: TestProjectsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            {onCreateProject ? <button onClick={onCreateProject} disabled={loading || running?.testProject}>
                {running?.testProject ? "Creating..." : "Create Test Project"}
              </button> : null}
            {onRefresh ? <button onClick={onRefresh} disabled={loading}>
                Refresh
              </button> : null}
          </div>
          <div>
            {testProjects.length > 0 ? (
              <ul className="space-y-2">
                {testProjects.map((project) => {
                  const projectId = typeof project.id === "string" ? project.id : String(project.id || "");
                  const projectName = typeof project.name === "string" ? project.name : projectId;
                  return (
                    <li key={projectId} className="flex justify-between">
                      <span>{projectName}</span>
                      {onDeleteProject ? <button onClick={() => onDeleteProject(projectId)} disabled={loading}>
                          Delete
                        </button> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">No test projects</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

