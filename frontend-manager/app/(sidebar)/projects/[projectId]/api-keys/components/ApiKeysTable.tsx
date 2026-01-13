"use client";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Edit,
  Eye,
  EyeOff,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { ApiKey } from "../types";
import { formatDate, isExpired, isExpiringSoon } from "../utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectScope } from "@/lib/krapi-constants";

const scopeLabels: Record<string, string> = {
  [ProjectScope.USERS_READ]: "Read Users (in this project)",
  [ProjectScope.USERS_WRITE]: "Write Users (in this project)",
  [ProjectScope.USERS_DELETE]: "Delete Users (in this project)",
  [ProjectScope.COLLECTIONS_READ]: "Read Collections",
  [ProjectScope.COLLECTIONS_WRITE]: "Write Collections",
  [ProjectScope.COLLECTIONS_DELETE]: "Delete Collections",
  [ProjectScope.DOCUMENTS_READ]: "Read Documents",
  [ProjectScope.DOCUMENTS_WRITE]: "Write Documents",
  [ProjectScope.DOCUMENTS_DELETE]: "Delete Documents",
  [ProjectScope.FILES_READ]: "Read Files",
  [ProjectScope.FILES_WRITE]: "Write Files",
  [ProjectScope.FILES_DELETE]: "Delete Files",
  [ProjectScope.FUNCTIONS_EXECUTE]: "Execute Functions",
  [ProjectScope.EMAIL_SEND]: "Send Emails",
};

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  showApiKey: string | null;
  onToggleShowKey: (keyId: string) => void;
  onCopyKey: (key: string) => void;
  onEdit: (apiKey: ApiKey) => void;
  onRegenerate: (keyId: string) => void;
  onDelete: (keyId: string) => void;
}

export function ApiKeysTable({
  apiKeys,
  showApiKey,
  onToggleShowKey,
  onCopyKey,
  onEdit,
  onRegenerate,
  onDelete,
}: ApiKeysTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scopes</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((apiKey) => {
          const isShowing = showApiKey === apiKey.id;
          const keyValue = apiKey.key || "";
          const displayKey = isShowing
            ? keyValue
            : keyValue
            ? `${keyValue.substring(0, 8)}...${keyValue.substring(keyValue.length - 4)}`
            : "N/A";

          return (
            <TableRow key={apiKey.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{String(apiKey.name || "")}</div>
                  <div className="text-base text-muted-foreground">
                    Created by system
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-base bg-muted px-2 py-1 rounded">
                    {displayKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleShowKey(apiKey.id)}
                  >
                    {isShowing ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => keyValue && onCopyKey(keyValue)}
                    className={Boolean(keyValue) ? "" : "hidden"}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={apiKey.is_active ? "default" : "secondary"}
                    className={Boolean(apiKey.is_active) ? "" : "hidden"}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={Boolean(apiKey.is_active) ? "hidden" : ""}
                  >
                    Inactive
                  </Badge>
                  <Badge
                    variant="destructive"
                    className={Boolean(isExpired(apiKey.expires_at)) ? "" : "hidden"}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expired
                  </Badge>
                  <Badge
                    variant="outline"
                    className={Boolean(isExpiringSoon(apiKey.expires_at)) ? "" : "hidden"}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Expiring Soon
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(apiKey.scopes) ? apiKey.scopes : [])
                    .slice(0, 3)
                    .map((scope: string) => {
                      const scopeStr = String(scope || "");
                      const label = scopeLabels[scopeStr as ProjectScope];
                      const displayText = label ? String(label) : scopeStr;
                      return (
                        <Badge
                          key={scopeStr}
                          variant="outline"
                          className="text-base"
                        >
                          {displayText}
                        </Badge>
                      );
                    })}
                  <Badge
                    variant="outline"
                    className={`text-base ${Array.isArray(apiKey.scopes) && apiKey.scopes.length > 3 ? "" : "hidden"}`}
                  >
                    +{Array.isArray(apiKey.scopes) ? Math.max(0, apiKey.scopes.length - 3) : 0} more
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-base text-muted-foreground">
                  {formatDate(apiKey.expires_at)}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-base text-muted-foreground">
                  {formatDate(apiKey.created_at)}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(apiKey)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRegenerate(apiKey.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(apiKey.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

