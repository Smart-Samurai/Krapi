import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class UserController {
    static getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getUserById(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static deleteUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateUserPassword(req: AuthenticatedRequest, res: Response): Promise<void>;
    static toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createUser(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getUserStats(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=users.d.ts.map