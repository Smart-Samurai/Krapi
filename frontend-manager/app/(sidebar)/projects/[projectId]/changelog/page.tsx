"use client";

import {
  Calendar,
  User,
  FileText,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";

interface ChangelogEntry {
  id: string;
  project_id: string;
  entity_type: string;
  action: string;
  performed_by: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  collection_name?: string;
  document_id?: string;
}

export default function ProjectChangelogPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: "",
    limit: 50,
    offset: 0,
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    has_more: false,
  });

  const fetchChangelog = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
      });
      if (filters.action_type) {
        queryParams.append("action_type", filters.action_type);
      }
      const response = await fetch(
        `/krapi/k1/changelog/projects/${projectId}?${queryParams}`
      );
      const data = await response.json();
      if (data.success) {
        setEntries(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch changelog entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, toast, pagination]);

  useEffect(() => {
    fetchChangelog();
  }, [fetchChangelog]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      create: { variant: "default", label: "Created" },
      update: { variant: "secondary", label: "Updated" },
      delete: { variant: "destructive", label: "Deleted" },
    };
    const config = actionMap[action.toLowerCase()] || {
      variant: "outline",
      label: action,
    };
    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    );
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/krapi/k1/changelog/export/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
          ...filters,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `changelog-${projectId}-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "Changelog exported successfully",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to export changelog",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Changelog</h1>
          <p className="text-muted-foreground">
            View activity and changes for this project
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchChangelog}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            All changes and activities for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <Select
              value={filters.action_type}
              onValueChange={(value) =>
                setFilters({ ...filters, action_type: value, offset: 0 })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-6 text-center text-muted-foreground">
              Loading changelog entries...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No changelog entries found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(entry.action)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{entry.performed_by || "System"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.collection_name ? (
                          <Badge variant="secondary">
                            <FileText className="mr-1 h-3 w-3" />
                            {entry.collection_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.document_id && (
                          <span className="text-xs text-muted-foreground">
                            Doc: {entry.document_id.substring(0, 8)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.offset + 1}-
                  {pagination.offset + entries.length} of {pagination.total}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        offset: Math.max(0, filters.offset - filters.limit),
                      })
                    }
                    disabled={filters.offset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        offset: filters.offset + filters.limit,
                      })
                    }
                    disabled={!pagination.has_more}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
