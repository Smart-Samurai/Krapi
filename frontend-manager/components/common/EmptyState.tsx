/**
 * Empty State Component
 * 
 * Displays an empty state message with icon, title, description, and optional action button.
 * 
 * @module components/common/EmptyState
 * @example
 * <EmptyState
 *   icon={FolderOpen}
 *   title="No projects"
 *   description="Create your first project to get started"
 *   action={{ label: "Create Project", onClick: handleCreate }}
 * />
 */
"use client";

import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

/**
 * Empty State Props
 * 
 * @interface EmptyStateProps
 * @property {LucideIcon} icon - Icon to display
 * @property {string} title - Empty state title
 * @property {string} description - Empty state description
 * @property {Object} [action] - Optional action button
 * @property {string} action.label - Action button label
 * @property {Function} action.onClick - Action button click handler
 * @property {LucideIcon} [action.icon] - Optional action button icon
 * @property {string} [data-testid] - Optional test ID for the empty state
 */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  "data-testid"?: string;
}

/**
 * Empty State Component
 * 
 * Displays an empty state with icon, message, and optional action.
 * 
 * @param {EmptyStateProps} props - Component props
 * @returns {JSX.Element} Empty state component
 * 
 * @example
 * <EmptyState
 *   icon={FolderOpen}
 *   title="No projects"
 *   description="Create your first project"
 *   action={{ label: "Create", onClick: handleCreate }}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  "data-testid": dataTestId,
}: EmptyStateProps) {
  return (
    <Card data-testid={dataTestId}>
      <CardContent className="text-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {action && (
          <Button
            className="btn-add"
            onClick={action.onClick}
          >
            {action.icon && (
              <action.icon className="mr-2 h-4 w-4" />
            )}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
