"use client";

import type { ApiKeyFormData } from "../types";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const allScopes = Object.keys(scopeLabels) as ProjectScope[];

interface ApiKeyFormProps {
  formData: ApiKeyFormData;
  onNameChange: (value: string) => void;
  onExpiresAtChange: (value: string) => void;
  onScopeToggle: (scope: string) => void;
}

export function ApiKeyForm({
  formData,
  onNameChange,
  onExpiresAtChange,
  onScopeToggle,
}: ApiKeyFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">API Key Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Production API, Development API"
        />
      </div>
      <div>
        <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
        <Input
          id="expires_at"
          type="datetime-local"
          value={formData.expires_at}
          onChange={(e) => onExpiresAtChange(e.target.value)}
        />
      </div>
      <div>
        <Label>Permissions (Scopes) *</Label>
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded p-4">
          {allScopes.map((scope) => (
            <div key={scope} className="flex items-center space-x-2">
              <Checkbox
                id={scope}
                checked={formData.scopes.includes(scope)}
                onCheckedChange={() => onScopeToggle(scope)}
              />
              <Label
                htmlFor={scope}
                className="text-base font-normal cursor-pointer"
              >
                {scopeLabels[scope] || scope}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

