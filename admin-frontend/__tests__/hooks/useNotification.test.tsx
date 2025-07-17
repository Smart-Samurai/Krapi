import { renderHook, act } from "@testing-library/react";
import { useNotification } from "@/hooks/useNotification";
import "@testing-library/jest-dom";

// Mock timers for testing setTimeout behavior
jest.useFakeTimers();

describe("useNotification Hook", () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Basic Functionality", () => {
    it("initializes with empty notifications array", () => {
      const { result } = renderHook(() => useNotification());

      expect(result.current.notifications).toEqual([]);
    });

    it("provides all required methods", () => {
      const { result } = renderHook(() => useNotification());

      expect(typeof result.current.showSuccess).toBe("function");
      expect(typeof result.current.showError).toBe("function");
      expect(typeof result.current.showWarning).toBe("function");
      expect(typeof result.current.showInfo).toBe("function");
      expect(typeof result.current.removeNotification).toBe("function");
      expect(typeof result.current.clearAll).toBe("function");
      expect(typeof result.current.handleError).toBe("function");
    });
  });

  describe("Success Notifications", () => {
    it("adds success notification with correct properties", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Operation successful");
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: "success",
        message: "Operation successful",
        duration: 4000,
      });
      expect(result.current.notifications[0].id).toBeDefined();
      expect(result.current.notifications[0].timestamp).toBeDefined();
    });

    it("accepts custom duration for success notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Custom duration", 8000);
      });

      expect(result.current.notifications[0].duration).toBe(8000);
    });

    it("auto-removes success notification after duration", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Auto remove test", 1000);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe("Error Notifications", () => {
    it("adds error notification with correct properties", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showError("Something went wrong");
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: "error",
        message: "Something went wrong",
        duration: 6000,
      });
    });

    it("accepts custom duration for error notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showError("Custom error", 10000);
      });

      expect(result.current.notifications[0].duration).toBe(10000);
    });

    it("handles persistent error notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showError("Persistent error", 0); // 0 = no auto-remove
      });

      expect(result.current.notifications[0].duration).toBe(0);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1); // Should still be there
    });
  });

  describe("Warning Notifications", () => {
    it("adds warning notification with correct properties", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showWarning("Warning message");
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: "warning",
        message: "Warning message",
        duration: 5000,
      });
    });
  });

  describe("Info Notifications", () => {
    it("adds info notification with correct properties", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showInfo("Information message");
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: "info",
        message: "Information message",
        duration: 4000,
      });
    });
  });

  describe("Multiple Notifications", () => {
    it("handles multiple notifications correctly", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First message");
        result.current.showError("Second message");
        result.current.showWarning("Third message");
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0].message).toBe("First message");
      expect(result.current.notifications[1].message).toBe("Second message");
      expect(result.current.notifications[2].message).toBe("Third message");
    });

    it("maintains correct order of notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First");
      });

      act(() => {
        result.current.showError("Second");
      });

      // First notification should be at index 0 (oldest)
      expect(result.current.notifications[0].message).toBe("First");
      expect(result.current.notifications[1].message).toBe("Second");
    });

    it("limits maximum number of notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        // Add more than the limit (assuming limit is 5)
        for (let i = 1; i <= 7; i++) {
          result.current.showInfo(`Message ${i}`);
        }
      });

      expect(result.current.notifications).toHaveLength(5);
      // Should contain the latest 5 messages
      expect(result.current.notifications[0].message).toBe("Message 3");
      expect(result.current.notifications[4].message).toBe("Message 7");
    });
  });

  describe("Manual Removal", () => {
    it("removes specific notification by id", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First message");
        result.current.showError("Second message");
      });

      const firstNotificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(firstNotificationId);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].message).toBe("Second message");
    });

    it("handles removal of non-existent notification gracefully", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Test message");
      });

      act(() => {
        result.current.removeNotification("non-existent-id");
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it("clears all notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First");
        result.current.showError("Second");
        result.current.showWarning("Third");
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe("Error Handling Utility", () => {
    it("handles Error objects correctly", () => {
      const { result } = renderHook(() => useNotification());

      const error = new Error("Test error message");

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: "error",
        message: "Test error message",
      });
    });

    it("handles string errors correctly", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.handleError("String error message");
      });

      expect(result.current.notifications[0].message).toBe(
        "String error message"
      );
    });

    it("handles axios errors with response data", () => {
      const { result } = renderHook(() => useNotification());

      const axiosError = {
        response: {
          data: {
            error: "API error message",
          },
        },
        isAxiosError: true,
      };

      act(() => {
        result.current.handleError(axiosError);
      });

      expect(result.current.notifications[0].message).toBe("API error message");
    });

    it("handles axios errors without response data", () => {
      const { result } = renderHook(() => useNotification());

      const axiosError = {
        message: "Network error",
        isAxiosError: true,
      };

      act(() => {
        result.current.handleError(axiosError);
      });

      expect(result.current.notifications[0].message).toBe("Network error");
    });

    it("includes context message when provided", () => {
      const { result } = renderHook(() => useNotification());

      const error = new Error("Database connection failed");

      act(() => {
        result.current.handleError(error, "Failed to save user data");
      });

      expect(result.current.notifications[0].message).toBe(
        "Failed to save user data: Database connection failed"
      );
    });

    it("handles unknown error types with fallback message", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.handleError(null);
      });

      expect(result.current.notifications[0].message).toBe(
        "An unexpected error occurred"
      );
    });
  });

  describe("Auto-removal Timers", () => {
    it("cancels timer when notification is manually removed", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Test message", 5000);
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);

      // Advance timers to ensure no late removal happens
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it("cancels all timers when clearing all notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First", 3000);
        result.current.showError("Second", 4000);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toHaveLength(0);

      // Advance timers to ensure no late removals happen
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe("Notification IDs", () => {
    it("generates unique IDs for each notification", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First");
        result.current.showSuccess("Second");
        result.current.showSuccess("Third");
      });

      const ids = result.current.notifications.map((n) => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("generates consistent ID format", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("Test");
      });

      const id = result.current.notifications[0].id;
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("Timestamp Tracking", () => {
    it("adds timestamp to each notification", () => {
      const { result } = renderHook(() => useNotification());

      const beforeTime = Date.now();

      act(() => {
        result.current.showSuccess("Test");
      });

      const afterTime = Date.now();
      const timestamp = result.current.notifications[0].timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("maintains different timestamps for multiple notifications", () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess("First");
      });

      const firstTimestamp = result.current.notifications[0].timestamp;

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.showSuccess("Second");
      });

      const secondTimestamp = result.current.notifications[1].timestamp;

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });
  });
});
