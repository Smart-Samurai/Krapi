/**
 * Form Dialog Component
 * 
 * Reusable dialog component for forms with submit and cancel actions.
 * 
 * @module components/common/FormDialog
 * @example
 * <FormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Create Project"
 *   submitLabel="Create"
 *   onSubmit={handleSubmit}
 * >
 *   <FormFields />
 * </FormDialog>
 */
"use client";

import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Form Dialog Props
 * 
 * @interface FormDialogProps
 * @property {boolean} open - Whether dialog is open
 * @property {Function} onOpenChange - Open/close change handler
 * @property {string} title - Dialog title
 * @property {string} [description] - Optional dialog description
 * @property {ReactNode} children - Form content
 * @property {string} submitLabel - Submit button label
 * @property {string} [cancelLabel="Cancel"] - Cancel button label
 * @property {Function} onSubmit - Submit handler
 * @property {Function} [onCancel] - Cancel handler (optional)
 * @property {boolean} [isSubmitting=false] - Whether form is submitting
 * @property {string} [submitClassName="btn-add"] - Submit button CSS class
 * @property {"sm" | "md" | "lg" | "xl" | "2xl" | "4xl"} [maxWidth="md"] - Maximum dialog width
 * @property {boolean} [disabled=false] - Whether submit is disabled
 */
interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitClassName?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  disabled?: boolean;
}

/**
 * Form Dialog Component
 * 
 * Dialog wrapper for forms with submit and cancel buttons.
 * 
 * @param {FormDialogProps} props - Component props
 * @returns {JSX.Element} Form dialog
 * 
 * @example
 * <FormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Create Project"
 *   submitLabel="Create"
 *   onSubmit={handleSubmit}
 * >
 *   <FormFields />
 * </FormDialog>
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel,
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitClassName = "btn-add",
  maxWidth = "md",
  disabled = false,
}: FormDialogProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${maxWidthClasses[maxWidth]} max-h-[80vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="space-y-4">
          {children}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              className={submitClassName}
              disabled={isSubmitting || disabled}
            >
              {isSubmitting ? "Processing..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
