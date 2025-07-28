import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class AuthController {
    static login(req: Request, res: Response): Promise<void>;
    static verify(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getLoginLogs(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getDatabaseStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getUserById(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static deleteUser(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=auth.d.ts.map