/**
 * Project Settings Page
 * 
 * Page for managing project-specific settings including general configuration,
 * API keys, and project metadata.
 * 
 * @module app/(sidebar)/projects/[projectId]/settings/page
 * @example
 * // Automatically rendered at /projects/[projectId]/settings route
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Project, ProjectSettings } from "@/lib/krapi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjectById, updateProject } from "@/store/projectsSlice";
import { beginBusy, endBusy } from "@/store/uiSlice";

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
});

const backupAutomationSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["hourly", "daily", "weekly", "monthly"]),
  time: z.string().optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  retention_days: z.number().min(1).optional(),
  max_backups: z.number().min(1).optional(),
  include_files: z.boolean(),
  description_template: z.string().optional(),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;
type BackupAutomationFormData = z.infer<typeof backupAutomationSchema>;

export default function ProjectSettingsPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((s) => s.projects);
  const project = projectsState.items.find((p) => p.id === projectId) || null;
  const isLoading = projectsState.loading;

  const [error, setError] = useState<string | null>(null);
  const [_projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);
  const [_loadingSettings, setLoadingSettings] = useState(false);

  const form = useForm<ProjectSettingsFormData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  const backupForm = useForm<BackupAutomationFormData>({
    resolver: zodResolver(backupAutomationSchema),
    defaultValues: {
      enabled: false,
      frequency: "daily",
      time: "00:00",
      day_of_week: 0,
      day_of_month: 1,
      retention_days: 30,
      max_backups: 10,
      include_files: false,
      description_template: "Automated backup - {date}",
    },
  });

  const fetchProjectDetails = useCallback(() => {
    dispatch(fetchProjectById({ id: projectId }));
  }, [dispatch, projectId]);

  const fetchProjectSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`/api/projects/${projectId}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const settings = await response.json();
        setProjectSettings(settings);
        
        // Update backup form with existing settings
        if (settings.backup_automation) {
          backupForm.reset({
            enabled: settings.backup_automation.enabled || false,
            frequency: settings.backup_automation.frequency || "daily",
            time: settings.backup_automation.time || "00:00",
            day_of_week: settings.backup_automation.day_of_week ?? 0,
            day_of_month: settings.backup_automation.day_of_month ?? 1,
            retention_days: settings.backup_automation.retention_days || 30,
            max_backups: settings.backup_automation.max_backups || 10,
            include_files: settings.backup_automation.include_files || false,
            description_template: settings.backup_automation.description_template || "Automated backup - {date}",
          });
        }
      }
    } catch (_error: unknown) {
    } finally {
      setLoadingSettings(false);
    }
  }, [projectId, backupForm]);

  useEffect(() => {
    fetchProjectDetails();
    fetchProjectSettings();
  }, [fetchProjectDetails, fetchProjectSettings]);

  useEffect(() => {
    if (project) {
      // Handle both 'is_active' and 'active' fields (backend may return either)
      // Priority: is_active > active (is_active is the canonical field name)
      const isActive = (project as { is_active?: boolean; active?: boolean }).is_active ?? 
                      (project as { is_active?: boolean; active?: boolean }).active ?? 
                      true;
      
      form.reset({
        name: project.name,
        description: project.description || "",
        is_active: isActive,
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
        })
      );
      if (updateProject.fulfilled.match(action)) {
        toast.success("Project settings updated successfully");
        setError(null);
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update project settings";
        setError(String(msg));
        toast.error("Failed to update project settings");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while updating project settings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      dispatch(endBusy());
    }
  };

  const onBackupSubmit = async (data: BackupAutomationFormData) => {
    try {
      dispatch(beginBusy());
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backup_automation: data,
        }),
      });

      if (response.ok) {
        toast.success("Backup automation settings updated successfully");
        await fetchProjectSettings();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update backup automation settings");
        toast.error("Failed to update backup automation settings");
      }
    } catch (_error: unknown) {
      setError("An error occurred while updating backup automation settings");
      toast.error("Failed to update backup automation settings");
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="cursor-pointer">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-bold">Project Settings</h1>
            <p className="text-muted-foreground">
              Manage settings for this project
            </p>
          </div>
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
                  <FormItem className="flex items-center justify-between  border p-3 shadow-sm">
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
                <Button type="submit" className="btn-confirm" data-testid="save-project-settings-button">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup Automation</CardTitle>
          <CardDescription>
            Configure automated backups for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...backupForm}>
            <form
              onSubmit={backupForm.handleSubmit(onBackupSubmit)}
              className="space-y-6"
            >
              <FormField
                control={backupForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Automated Backups
                      </FormLabel>
                      <FormDescription>
                        Automatically create backups according to the schedule
                        below
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

              {backupForm.watch("enabled") && (
                <>
                  <FormField
                    control={backupForm.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backup Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How often backups should be created
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {backupForm.watch("frequency") !== "hourly" && (
                    <FormField
                      control={backupForm.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time of Day</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || "00:00"}
                            />
                          </FormControl>
                          <FormDescription>
                            Time when backups should run (HH:mm format)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {backupForm.watch("frequency") === "weekly" && (
                    <FormField
                      control={backupForm.control}
                      name="day_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Week</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Day of the week for weekly backups
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {backupForm.watch("frequency") === "monthly" && (
                    <FormField
                      control={backupForm.control}
                      name="day_of_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Month</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              {...field}
                              value={field.value || 1}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Day of the month for monthly backups (1-31)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={backupForm.control}
                    name="retention_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retention Period (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            value={field.value || 30}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          How many days to keep backups before automatic
                          deletion
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={backupForm.control}
                    name="max_backups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Backups</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            value={field.value || 10}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of backups to keep (oldest will be
                          deleted)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={backupForm.control}
                    name="include_files"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Include Files
                          </FormLabel>
                          <FormDescription>
                            Include uploaded files in backups (increases backup
                            size)
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

                  <FormField
                    control={backupForm.control}
                    name="description_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description Template</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Automated backup - {date}"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Template for backup descriptions. Use {"{date}"} for
                          timestamp
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex justify-end">
                <Button type="submit" className="btn-confirm">
                  <Save className="mr-2 h-4 w-4" /> Save Backup Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
