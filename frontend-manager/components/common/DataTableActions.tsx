/**
 * Data Table Actions Component
 * 
 * Dropdown menu component for data table row actions (view, edit, delete).
 * 
 * @module components/common/DataTableActions
 * @example
 * <DataTableActions
 *   onView={() => handleView(item)}
 *   onEdit={() => handleEdit(item)}
 *   onDelete={() => handleDelete(item)}
 * />
 */
"use client";

import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Data Table Actions Props
 * 
 * @interface DataTableActionsProps
 * @property {Function} [onEdit] - Edit action handler
 * @property {Function} [onView] - View action handler
 * @property {Function} [onDelete] - Delete action handler
 * @property {string} [deleteLabel="Delete"] - Delete button label
 * @property {string} [editLabel="Edit"] - Edit button label
 * @property {string} [viewLabel="View Details"] - View button label
 */
interface DataTableActionsProps {
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  viewLabel?: string;
}

/**
 * Data Table Actions Component
 * 
 * Dropdown menu with view, edit, and delete actions for data table rows.
 * 
 * @param {DataTableActionsProps} props - Component props
 * @returns {JSX.Element | null} Actions dropdown or null if no actions
 * 
 * @example
 * <DataTableActions
 *   onView={handleView}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 */
export function DataTableActions({
  onEdit,
  onView,
  onDelete,
  deleteLabel = "Delete",
  editLabel = "Edit",
  viewLabel = "View Details",
}: DataTableActionsProps) {
  const hasActions = onEdit || onView || onDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {(onView || onEdit) && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
