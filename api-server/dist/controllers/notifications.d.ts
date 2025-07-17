import { Request, Response } from "express";
export declare class NotificationsController {
    static getUserNotifications(req: Request, res: Response): Promise<void>;
    static markAsRead(req: Request, res: Response): Promise<void>;
    static markAllAsRead(req: Request, res: Response): Promise<void>;
    static deleteNotification(req: Request, res: Response): Promise<void>;
    static getNotificationPreferences(req: Request, res: Response): Promise<void>;
    static updateNotificationPreferences(req: Request, res: Response): Promise<void>;
    static getUnreadCount(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=notifications.d.ts.map