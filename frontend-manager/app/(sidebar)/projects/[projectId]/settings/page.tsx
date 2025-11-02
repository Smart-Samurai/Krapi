"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { Project } from "@/lib/krapi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjectById, updateProject } from "@/store/projectsSlice";
import { beginBusy, endBusy } from "@/store/uiSlice";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

export default function ProjectSettingsPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const krapi = useKrapi();
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((s) => s.projects);
  const project = projectsState.items.find((p) => p.id === projectId) || null;
  const isLoading = projectsState.loading;

  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProjectSettingsFormData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  const fetchProjectDetails = useCallback(() => {
    dispatch(fetchProjectById({ id: projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        is_active: project.is_active,
      });
    }
  }, [project, form]);

  const onSubmit = async (data: ProjectSettingsFormData) => {
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        updateProject({
          id: projectId,
          updates: {
            name: data.name,
            description: data.description,
            active: data.is_active,
          } as Partial<Project>,
          krapi,
        })
      );
      if (updateProject.fulfilled.match(action)) {
        toast.success("Project settings updated successfully");
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update project settings";
        setError(String(msg));
        toast.error("Failed to update project settings");
      }
    } catch {
      setError("An error occurred while updating project settings");
    } finally {
      dispatch(endBusy());
    }
  };

  if (isLoading && !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Settings</h1>
          <p className="text-muted-foreground">
            Manage settings for this project
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic information and status</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        placeholder="Describe your project"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Whether the project is active
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

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
