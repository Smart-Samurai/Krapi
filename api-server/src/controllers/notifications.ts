import { Request, Response } from "express";
import database from "../services/database";
import { ApiResponse } from "../types";

interface Notification {
  id: number;
  user_id: number;
  type:
    | "content_created"
    | "content_updated"
    | "user_created"
    | "file_uploaded"
    | "system_alert";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

interface NotificationSummary {
  total: number;
  unread: number;
  notifications: Notification[];
}

export class NotificationsController {
  static async getUserNotifications(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { limit = 20, unread_only = "false" } = req.query;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const notifications = database.getUserNotifications(
        userId,
        parseInt(limit as string) || 20,
        unread_only === "true"
      );

      const unreadCount = database.getUnreadNotificationCount(userId);

      const summary: NotificationSummary = {
        total: notifications.length,
        unread: unreadCount,
        notifications,
      };

      const response: ApiResponse<NotificationSummary> = {
        success: true,
        data: summary,
        message: `Retrieved ${notifications.length} notifications`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get notifications error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve notifications",
      };
      res.status(500).json(response);
    }
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const updated = database.markNotificationAsRead(parseInt(id), userId);

      if (updated) {
        const response: ApiResponse = {
          success: true,
          message: "Notification marked as read",
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: "Notification not found or access denied",
        };
        res.status(404).json(response);
      }
    } catch (error) {
      console.error("Mark notification as read error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to mark notification as read",
      };
      res.status(500).json(response);
    }
  }

  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const count = database.markAllNotificationsAsRead(userId);

      const response: ApiResponse = {
        success: true,
        message: `Marked ${count} notifications as read`,
      };

      res.json(response);
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to mark notifications as read",
      };
      res.status(500).json(response);
    }
  }

  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const deleted = database.deleteNotification(parseInt(id), userId);

      if (deleted) {
        const response: ApiResponse = {
          success: true,
          message: "Notification deleted",
        };
        res.json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: "Notification not found or access denied",
        };
        res.status(404).json(response);
      }
    } catch (error) {
      console.error("Delete notification error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete notification",
      };
      res.status(500).json(response);
    }
  }

  static async getNotificationPreferences(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const preferences = database.getNotificationPreferences(userId);

      const response: ApiResponse = {
        success: true,
        data: preferences || {
          email_notifications: true,
          push_notifications: true,
          content_updates: true,
          user_activities: false,
          system_alerts: true,
        },
        message: "Notification preferences retrieved",
      };

      res.json(response);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve notification preferences",
      };
      res.status(500).json(response);
    }
  }

  static async updateNotificationPreferences(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const preferences = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const updatedPreferences = database.setNotificationPreferences({
        user_id: userId,
        email_notifications: preferences.email_notifications ?? true,
        content_updates: preferences.content_updates ?? true,
        user_management: preferences.user_management ?? true,
        system_alerts: preferences.system_alerts ?? true,
        marketing_emails: preferences.marketing_emails ?? true,
      });

      const response: ApiResponse = {
        success: true,
        data: updatedPreferences,
        message: "Notification preferences updated successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update notification preferences",
      };
      res.status(500).json(response);
    }
  }

  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const unreadCount = database.getUnreadNotificationCount(userId);

      const response: ApiResponse = {
        success: true,
        data: { unreadCount },
        message: "Unread notification count retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Get unread count error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to get unread notification count",
      };
      res.status(500).json(response);
    }
  }
}
