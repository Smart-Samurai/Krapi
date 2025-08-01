import { useState, useCallback } from "react";

/**
 * Toast notification options
 */
interface ToastOptions {
  /** Toast title text */
  title?: string;
  /** Toast description/body text */
  description?: string;
  /** Visual style variant */
  variant?: "default" | "success" | "error" | "warning" | "info";
  /** Auto-dismiss duration in milliseconds (default: 3000) */
  duration?: number;
}

/**
 * Internal toast state
 */
interface ToastState extends ToastOptions {
  /** Unique toast identifier */
  id: string;
  /** Whether toast is currently visible */
  isOpen: boolean;
}

/**
 * Toast Notification Hook
 * 
 * Manages toast notifications with auto-dismiss functionality.
 * Supports multiple simultaneous toasts with different variants.
 * 
 * @example
 * ```tsx
 * const { toast, dismiss } = useToast();
 * 
 * // Show success toast
 * toast({
 *   title: "Success",
 *   description: "Operation completed successfully",
 *   variant: "success"
 * });
 * 
 * // Show error toast with custom duration
 * toast({
 *   title: "Error",
 *   description: "Something went wrong",
 *   variant: "error",
 *   duration: 5000
 * });
 * ```
 * 
 * @returns Toast management functions and state
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  /**
   * Show a new toast notification
   * 
   * @param options - Toast configuration options
   */
  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastState = {
      id,
      isOpen: true,
      title: options.title || "Notification",
      description: options.description || "",
      variant: options.variant || "default",
      duration: options.duration || 3000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      dismiss(id);
    }, newToast.duration);
  }, []);

  /**
   * Dismiss a specific toast by ID
   * 
   * @param id - Toast ID to dismiss
   */
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Dismiss all active toasts
   */
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    /** Array of active toasts */
    toasts,
    /** Function to show a new toast */
    toast,
    /** Function to dismiss a specific toast */
    dismiss,
    /** Function to dismiss all toasts */
    dismissAll,
  };
}
