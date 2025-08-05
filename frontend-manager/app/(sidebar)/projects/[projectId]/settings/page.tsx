"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project } from "@/lib/krapi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Settings, Trash2, AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProjectSettingsFormData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (krapi && projectId) {
      fetchProjectDetails();
    }
  }, [projectId, krapi]);

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        is_active: project.is_active,
      });
    }
  }, [project, form]);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await krapi.projects.getById(projectId);

      if (result.success && result.data) {
        setProject(result.data);
      } else {
        setError(result.error || "Failed to fetch project details");
      }
    } catch (err) {
      setError("An error occurred while fetching project details");
      console.error("Error fetching project details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProjectSettingsFormData) => {
    if (!krapi || !project) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await krapi.projects.update(projectId, {
        name: data.name,
        description: data.description,
        is_active: data.is_active,
      });

      if (result.success && result.data) {
        setProject(result.data);
        toast.success("Project settings updated successfully");
      } else {
        setError(result.error || "Failed to update project settings");
        toast.error("Failed to update project settings");
      }
    } catch (err) {
      setError("An error occurred while updating project settings");
      toast.error("An error occurred while updating project settings");
      console.error("Error updating project settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!krapi || !project) return;

    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await krapi.projects.delete(projectId);

      if (result.success) {
        toast.success("Project deleted successfully");
        // Redirect to projects list
        window.location.href = "/projects";
      } else {
        setError(result.error || "Failed to delete project");
        toast.error("Failed to delete project");
      }
    } catch (err) {
      setError("An error occurred while deleting project");
      toast.error("An error occurred while deleting project");
      console.error("Error deleting project:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!krapi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">
          Manage your project configuration and settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Update your project's basic information and configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter project description"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description of your project.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active Status
                        </FormLabel>
                        <FormDescription>
                          Enable or disable this project. Inactive projects
                          cannot be accessed.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSaving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Details about your project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project ID</Label>
              <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {project.id}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(project.created_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(project.updated_at).toLocaleString()}
              </p>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-destructive">
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  Irreversible and destructive actions.
                </p>
              </div>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Project
                  </CardTitle>
                  <CardDescription>
                    Permanently delete this project and all its data. This
                    action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteProject}
                    disabled={isSaving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
