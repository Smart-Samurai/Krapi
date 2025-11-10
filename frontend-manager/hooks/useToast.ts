/**
 * Toast Notification Hook
 * 
 * Hook for managing toast notifications with auto-dismiss functionality.
 * Supports multiple simultaneous toasts with different variants.
 * 
 * @module hooks/useToast
 * @example
 * const { toast, dismiss } = useToast();
 * toast({ title: "Success", description: "Operation completed", variant: "success" });
 */
import { useState, useCallback } from "react";

/**
 * Toast Notification Options
 * 
 * @interface ToastOptions
 * @property {string} [title] - Toast title text
 * @property {string} [description] - Toast description/body text
 * @property {"default" | "success" | "error" | "warning" | "info"} [variant="default"] - Visual style variant
 * @property {number} [duration=3000] - Auto-dismiss duration in milliseconds
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
 * Internal Toast State
 * 
 * @interface ToastState
 * @extends {ToastOptions}
 * @property {string} id - Unique toast identifier
 * @property {boolean} isOpen - Whether toast is currently visible
 */
interface ToastState extends ToastOptions {
  /** Unique toast identifier */
  id: string;
  /** Whether toast is currently visible */
  isOpen: boolean;
}

/**
 * Use Toast Hook
 * 
 * Manages toast notifications with auto-dismiss functionality.
 * 
 * @returns {Object} Toast management functions and state
 * @returns {ToastState[]} returns.toasts - Array of active toasts
 * @returns {Function} returns.toast - Function to show a new toast
 * @returns {Function} returns.dismiss - Function to dismiss a specific toast
 * @returns {Function} returns.dismissAll - Function to dismiss all toasts
 * 
 * @example
 * const { toast, dismiss } = useToast();
 * toast({ title: "Success", description: "Done!", variant: "success" });
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  /**
   * Dismiss a specific toast by ID
   * 
   * @param id - Toast ID to dismiss
   */
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
  }, [dismiss]);

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
