import { useState, useCallback } from "react";
import { AxiosError } from "axios";

interface Notification {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration: number;
  timestamp: number;
}

interface UseNotificationReturn {
  notifications: Notification[];
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  handleError: (error: unknown, fallbackMessage?: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: Date.now(),
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Keep only latest 5 notifications
        return updated.slice(0, 5);
      });

      // Auto-remove notification if duration > 0
      if (notification.duration > 0) {
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== newNotification.id)
          );
        }, notification.duration);
      }

      return newNotification.id;
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, duration = 5000) => {
      addNotification({ message, type: "success", duration });
    },
    [addNotification]
  );

  const showError = useCallback(
    (message: string, duration = 8000) => {
      addNotification({ message, type: "error", duration });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (message: string, duration = 6000) => {
      addNotification({ message, type: "warning", duration });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (message: string, duration = 4000) => {
      addNotification({ message, type: "info", duration });
    },
    [addNotification]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallbackMessage = "An error occurred") => {
      console.error("Error:", error);

      let errorMessage = fallbackMessage;

      if (error instanceof AxiosError) {
        // Handle API errors
        const apiError = error.response?.data?.error;
        if (apiError) {
          errorMessage = apiError;
        } else {
          // Handle different HTTP status codes
          switch (error.response?.status) {
            case 401:
              errorMessage = "Unauthorized. Please log in again.";
              break;
            case 403:
              errorMessage = "Access denied. You don't have permission.";
              break;
            case 404:
              errorMessage = "Resource not found.";
              break;
            case 422:
              errorMessage = "Invalid data provided.";
              break;
            case 429:
              errorMessage = "Too many requests. Please try again later.";
              break;
            case 500:
              errorMessage = "Server error. Please try again later.";
              break;
            default:
              errorMessage = error.message || fallbackMessage;
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      showError(errorMessage);
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
