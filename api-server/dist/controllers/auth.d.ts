import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class AuthController {
    static login(req: Request, res: Response): Promise<void>;
    static verify(req: AuthenticatedRequest, res: Response): Promise<void>;
    static changePassword(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getUserStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getSecuritySettings(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateSecuritySettings(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getLoginLogs(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void>;
    static terminateSession(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getProfile(req: Request, res: Response): void;
    static updateProfile(req: Request, res: Response): void;
}
//# sourceMappingURL=auth.d.ts.map