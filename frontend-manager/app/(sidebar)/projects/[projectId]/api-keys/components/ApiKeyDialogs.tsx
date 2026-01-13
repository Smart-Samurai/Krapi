"use client";

import { Plus } from "lucide-react";

import type { ApiKeyFormData } from "../types";

import { ApiKeyForm } from "./ApiKeyForm";

import { ActionButton, CodeSnippet } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ApiKeyDialogsProps {
  projectId: string;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  formData: ApiKeyFormData;
  onCreateDialogChange: (open: boolean) => void;
  onEditDialogChange: (open: boolean) => void;
  onFormDataChange: (data: Partial<ApiKeyFormData>) => void;
  onScopeToggle: (scope: string) => void;
  onCreate: () => void;
  onUpdate: () => void;
}

export function ApiKeyDialogs({
  projectId,
  isCreateDialogOpen,
  isEditDialogOpen,
  formData,
  onCreateDialogChange,
  onEditDialogChange,
  onFormDataChange,
  onScopeToggle,
  onCreate,
  onUpdate,
}: ApiKeyDialogsProps) {
  // Return a single div wrapper instead of fragment to ensure proper rendering
  return (
    <div className="flex items-center gap-2">
      <CodeSnippet context="api-keys" projectId={projectId} />
      <Dialog open={isCreateDialogOpen} onOpenChange={onCreateDialogChange}>
        <DialogTrigger asChild>
          <ActionButton
            variant="add"
            icon={Plus}
            data-testid="create-api-key-button"
          >
            Create API Key
          </ActionButton>
        </DialogTrigger>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          data-testid="create-api-key-dialog"
        >
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key with specific permissions and expiry date
            </DialogDescription>
          </DialogHeader>
          <ApiKeyForm
            formData={formData}
            onNameChange={(value) =>
              onFormDataChange({ name: value })
            }
            onExpiresAtChange={(value) =>
              onFormDataChange({ expires_at: value })
            }
            onScopeToggle={onScopeToggle}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onCreateDialogChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={onCreate} data-testid="create-api-key-dialog-submit">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={onEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Modify API key permissions and settings
            </DialogDescription>
          </DialogHeader>
          <ApiKeyForm
            formData={formData}
            onNameChange={(value) => onFormDataChange({ name: value })}
            onExpiresAtChange={(value) =>
              onFormDataChange({ expires_at: value })
            }
            onScopeToggle={onScopeToggle}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onEditDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={onUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

