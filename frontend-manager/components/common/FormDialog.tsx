"use client";

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FormDialogProps {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitLabel?: string;
  onSubmit?: (e?: React.BaseSyntheticEvent) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  submitClassName?: string;
  "data-testid"?: string;
}

export function FormDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  submitLabel = "Submit",
  onSubmit,
  onCancel,
  isSubmitting = false,
  disabled = false,
  submitClassName,
  "data-testid": testId,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {(onSubmit || onCancel) ? <div className="flex justify-end gap-2 mt-4">
            {onCancel ? <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border rounded"
                disabled={isSubmitting || disabled}
                data-testid={testId ? `${testId}-cancel` : "form-dialog-cancel"}
              >
                Cancel
              </button> : null}
            {onSubmit ? <button
                type="button"
                onClick={onSubmit}
                className={submitClassName || "px-4 py-2 bg-primary text-primary-foreground rounded"}
                disabled={isSubmitting || disabled}
                data-testid={testId ? `${testId}-submit` : "form-dialog-submit"}
              >
                {isSubmitting ? "Submitting..." : submitLabel}
              </button> : null}
          </div> : null}
      </DialogContent>
    </Dialog>
  );
}

