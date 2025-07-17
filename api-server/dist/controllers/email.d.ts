import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class EmailController {
    static getEmailConfiguration(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateEmailConfiguration(req: AuthenticatedRequest, res: Response): Promise<void>;
    static testEmailConnection(req: AuthenticatedRequest, res: Response): Promise<void>;
    static sendEmail(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getAllTemplates(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getTemplateById(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createTemplate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getEmailLogs(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getEmailStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=email.d.ts.map