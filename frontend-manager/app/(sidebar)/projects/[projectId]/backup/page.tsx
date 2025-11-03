"use client";

import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  HardDrive,
  Plus,
  Lock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";

interface Backup {
  id: string;
  project_id: string;
  type: "project" | "system";
  created_at: string;
  size: number;
  encrypted: boolean;
  version: string;
  description?: string;
}

export default function ProjectBackupPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [createForm, setCreateForm] = useState({
    description: "",
    password: "",
  });
  const [restoreForm, setRestoreForm] = useState({
    password: "",
    overwrite: false,
  });

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/backups?type=project`
      );
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups || []);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch backups",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Backup created successfully",
        });
        setCreateDialogOpen(false);
        setCreateForm({ description: "", password: "" });
        fetchBackups();
      } else {
        throw new Error(data.error || "Failed to create backup");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create backup",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    try {
      setRestoring(selectedBackup.id);
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup_id: selectedBackup.id,
          password: restoreForm.password,
          overwrite: restoreForm.overwrite,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Project restored successfully",
        });
        setRestoreDialogOpen(false);
        setRestoreForm({ password: "", overwrite: false });
        setSelectedBackup(null);
      } else {
        throw new Error(data.error || "Failed to restore backup");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to restore backup",
        variant: "error",
      });
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      setDeleting(backupId);
      const response = await fetch(`/api/krapi/k1/backups/${backupId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Backup deleted successfully",
        });
        fetchBackups();
      } else {
        throw new Error(data.error || "Failed to delete backup");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete backup",
        variant: "error",
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">Backups</h1>
          <p className="text-muted-foreground">
            Manage encrypted backups for this project
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project Backup</DialogTitle>
              <DialogDescription>
                Create an encrypted backup of this project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  placeholder="Backup description"
                />
              </div>
              <div>
                <Label htmlFor="password">Encryption Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Enter encryption password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="btn-add" onClick={handleCreateBackup} disabled={creating}>
                {creating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              Loading backups...
            </div>
          </CardContent>
        </Card>
      ) : backups.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Backups</AlertTitle>
          <AlertDescription>
            No backups found for this project. Create your first backup to get
            started.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Project Backups</CardTitle>
            <CardDescription>
              List of encrypted backups for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4" />
                        <span>
                          {backup.description || "Untitled Backup"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(backup.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatBytes(backup.size || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{backup.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {backup.encrypted ? (
                        <Badge variant="default">
                          <Lock className="mr-1 h-3 w-3" />
                          Encrypted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unencrypted</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          className="btn-confirm"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreDialogOpen(true);
                          }}
                          disabled={restoring !== null}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                        <Button
                          className="btn-delete"
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={deleting === backup.id}
                        >
                          {deleting === backup.id ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Project Backup</DialogTitle>
            <DialogDescription>
              Restore this project from an encrypted backup. This will
              overwrite current project data.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Restoring this backup will overwrite all current project data.
                  Make sure you have a current backup before proceeding.
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="restore-password">Backup Password</Label>
                <Input
                  id="restore-password"
                  type="password"
                  value={restoreForm.password}
                  onChange={(e) =>
                    setRestoreForm({
                      ...restoreForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter backup encryption password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={restoreForm.overwrite}
                  onChange={(e) =>
                    setRestoreForm({
                      ...restoreForm,
                      overwrite: e.target.checked,
                    })
                  }
                />
                <Label htmlFor="overwrite">
                  Overwrite existing data (recommended)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="btn-confirm"
              onClick={handleRestoreBackup}
              disabled={restoring !== null || !restoreForm.password}
            >
              {restoring ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Restore Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
