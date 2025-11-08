/**
 * Notification Hook
 * 
 * Hook for managing application notifications with auto-dismiss functionality.
 * Supports success, error, warning, and info notification types.
 * 
 * @module hooks/useNotification
 * @example
 * const { showSuccess, showError, notifications } = useNotification();
 * showSuccess('Operation completed!');
 */
import { useState, useCallback } from "react";
import { AxiosError } from "axios";

/**
 * Notification Interface
 * 
 * @interface Notification
 * @property {string} id - Unique notification ID
 * @property {string} message - Notification message
 * @property {"success" | "error" | "warning" | "info"} type - Notification type
 * @property {number} duration - Display duration in milliseconds
 * @property {number} timestamp - Creation timestamp
 */
interface Notification {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration: number;
  timestamp: number;
}

/**
 * Notification Type
 * 
 * @typedef {"success" | "error" | "warning" | "info"} NotificationType
 */
type NotificationType = "success" | "error" | "warning" | "info";

/**
 * Use Notification Return Type
 * 
 * @interface UseNotificationReturn
 * @property {Notification[]} notifications - Array of active notifications
 * @property {Function} showSuccess - Show success notification
 * @property {Function} showError - Show error notification
 * @property {Function} showWarning - Show warning notification
 * @property {Function} showInfo - Show info notification
 * @property {Function} removeNotification - Remove notification by ID
 * @property {Function} clearAll - Clear all notifications
 * @property {Function} handleError - Handle errors and show error notification
 */
interface UseNotificationReturn {
  notifications: Notification[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  handleError: (error: unknown, fallbackMessage?: string) => void;
}

/**
 * Generate unique notification ID
 * 
 * @returns {string} Random ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Use Notification Hook
 * 
 * Manages application notifications with auto-dismiss (5 seconds).
 * 
 * @returns {UseNotificationReturn} Notification management functions and state
 * 
 * @example
 * const { showSuccess, showError, notifications } = useNotification();
 * 
 * // Show success notification
 * showSuccess('Operation completed successfully');
 * 
 * // Show error notification
 * showError('Something went wrong');
 * 
 * // Handle errors automatically
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, 'Failed to complete operation');
 * }
 */
export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType = "info") => {
      const id = generateId();
      const notification: Notification = {
        id,
        message,
        type,
        duration: 5000,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showNotification(message, "success");
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string) => {
      showNotification(message, "error");
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string) => {
      showNotification(message, "warning");
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string) => {
      showNotification(message, "info");
    },
    [showNotification]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleError = useCallback(
    (error: unknown, defaultMessage = "An error occurred") => {
      const message = error instanceof Error ? error.message : String(error);
      showError(message || defaultMessage);
    },
    [showError]
  );

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll,
    handleError,
  };
};

// Legacy hooks for backward compatibility
interface UseErrorHandlerReturn {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  handleError: (error: unknown, fallbackMessage?: string) => void;
  isError: boolean;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallbackMessage = "An error occurred") => {
      console.error("Error:", error);

      if (error instanceof AxiosError) {
        const apiError = error.response?.data?.error;
        if (apiError) {
          setError(apiError);
          return;
        }

        switch (error.response?.status) {
          case 401:
            setError("Unauthorized. Please log in again.");
            break;
          case 403:
            setError("Access denied. You don't have permission.");
            break;
          case 404:
            setError("Resource not found.");
            break;
          case 422:
            setError("Invalid data provided.");
            break;
          case 429:
            setError("Too many requests. Please try again later.");
            break;
          case 500:
            setError("Server error. Please try again later.");
            break;
          default:
            setError(error.message || fallbackMessage);
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === "string") {
        setError(error);
      } else {
        setError(fallbackMessage);
      }
    },
    []
  );

  return {
    error,
    setError,
    clearError,
    handleError,
    isError: error !== null,
  };
};

interface UseSuccessHandlerReturn {
  success: string | null;
  setSuccess: (message: string | null) => void;
  clearSuccess: () => void;
  showSuccess: (message: string) => void;
  isSuccess: boolean;
}

export const useSuccessHandler = (): UseSuccessHandlerReturn => {
  const [success, setSuccess] = useState<string | null>(null);

  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
  }, []);

  return {
    success,
    setSuccess,
    clearSuccess,
    showSuccess,
    isSuccess: success !== null,
  };
};
