"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Project } from "@krapi/sdk";
import { FiSave } from "react-icons/fi";

export default function ProjectSettingsPage() {
  const params = useParams();
  const krapi = useKrapi();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (krapi && projectId) {
      fetchProject();
    }
  }, [krapi, projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await krapi.projects.getById(projectId);
      if (response.success && response.data) {
        setProject(response.data);
        setName(response.data.name);
        setDescription(response.data.description || "");
        setIsActive(response.data.active);
      } else {
        setError(response.error || "Failed to fetch project");
      }
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to fetch project");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await krapi.projects.update(projectId, {
        name,
        description,
        active: isActive,
      });

      if (response.success) {
        setSuccess("Project settings updated successfully");
        fetchProject(); // Refresh data
      } else {
        setError(response.error || "Failed to update project");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      setError("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  if (!krapi) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text/60">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text/60">Loading project settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Project Settings</h1>
          <p className="text-text/60 mt-2">
            Configure your project settings and preferences
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* General Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic information about your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active">Project Status</Label>
                <p className="text-sm text-text/60">
                  Inactive projects cannot be accessed via API
                </p>
              </div>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              API key and endpoint information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Project ID</Label>
              <Input value={project?.id || ""} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input 
                  value={project?.api_key || ""} 
                  readOnly 
                  className="bg-muted font-mono text-sm"
                />
                <Button variant="outline" size="sm">
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-text/60 mt-1">
                Use this key to authenticate API requests for this project
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Delete Project</h4>
                <p className="text-sm text-text/60 mb-3">
                  Once you delete a project, there is no going back. All data will be permanently removed.
                </p>
                <Button variant="destructive">
                  Delete This Project
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving}>
            <FiSave className="mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}