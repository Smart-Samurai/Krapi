"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const database_1 = __importDefault(require("../services/database"));
class NotificationsController {
    static async getUserNotifications(req, res) {
        try {
            const userId = req.user?.userId;
            const { limit = 20, unread_only = "false" } = req.query;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const notifications = database_1.default.getUserNotifications(userId, parseInt(limit) || 20, unread_only === "true");
            const unreadCount = database_1.default.getUnreadNotificationCount(userId);
            const summary = {
                total: notifications.length,
                unread: unreadCount,
                notifications,
            };
            const response = {
                success: true,
                data: summary,
                message: `Retrieved ${notifications.length} notifications`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get notifications error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve notifications",
            };
            res.status(500).json(response);
        }
    }
    static async markAsRead(req, res) {
        try {
            const userId = req.user?.userId;
            const { id } = req.params;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const updated = database_1.default.markNotificationAsRead(parseInt(id), userId);
            if (updated) {
                const response = {
                    success: true,
                    message: "Notification marked as read",
                };
                res.json(response);
            }
            else {
                const response = {
                    success: false,
                    error: "Notification not found or access denied",
                };
                res.status(404).json(response);
            }
        }
        catch (error) {
            console.error("Mark notification as read error:", error);
            const response = {
                success: false,
                error: "Failed to mark notification as read",
            };
            res.status(500).json(response);
        }
    }
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const count = database_1.default.markAllNotificationsAsRead(userId);
            const response = {
                success: true,
                message: `Marked ${count} notifications as read`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Mark all notifications as read error:", error);
            const response = {
                success: false,
                error: "Failed to mark notifications as read",
            };
            res.status(500).json(response);
        }
    }
    static async deleteNotification(req, res) {
        try {
            const userId = req.user?.userId;
            const { id } = req.params;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const deleted = database_1.default.deleteNotification(parseInt(id), userId);
            if (deleted) {
                const response = {
                    success: true,
                    message: "Notification deleted",
                };
                res.json(response);
            }
            else {
                const response = {
                    success: false,
                    error: "Notification not found or access denied",
                };
                res.status(404).json(response);
            }
        }
        catch (error) {
            console.error("Delete notification error:", error);
            const response = {
                success: false,
                error: "Failed to delete notification",
            };
            res.status(500).json(response);
        }
    }
    static async getNotificationPreferences(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const preferences = database_1.default.getNotificationPreferences(userId);
            const response = {
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
        }
        catch (error) {
            console.error("Get notification preferences error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve notification preferences",
            };
            res.status(500).json(response);
        }
    }
    static async updateNotificationPreferences(req, res) {
        try {
            const userId = req.user?.userId;
            const preferences = req.body;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const updatedPreferences = database_1.default.setNotificationPreferences({
                user_id: userId,
                email_notifications: preferences.email_notifications ?? true,
                content_updates: preferences.content_updates ?? true,
                user_management: preferences.user_management ?? true,
                system_alerts: preferences.system_alerts ?? true,
                marketing_emails: preferences.marketing_emails ?? true,
            });
            const response = {
                success: true,
                data: updatedPreferences,
                message: "Notification preferences updated successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update notification preferences error:", error);
            const response = {
                success: false,
                error: "Failed to update notification preferences",
            };
            res.status(500).json(response);
        }
    }
    static async getUnreadCount(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                const response = {
                    success: false,
                    error: "User ID required",
                };
                res.status(400).json(response);
                return;
            }
            const unreadCount = database_1.default.getUnreadNotificationCount(userId);
            const response = {
                success: true,
                data: { unreadCount },
                message: "Unread notification count retrieved successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get unread count error:", error);
            const response = {
                success: false,
                error: "Failed to get unread notification count",
            };
            res.status(500).json(response);
        }
    }
}
exports.NotificationsController = NotificationsController;
//# sourceMappingURL=notifications.js.map