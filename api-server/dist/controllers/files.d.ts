import { Request, Response } from "express";
import multer from "multer";
import { AuthPayload } from "../types";
interface AuthenticatedRequest extends Request {
    user?: AuthPayload;
}
export declare const upload: multer.Multer;
export declare class FilesController {
    static getAllFiles(req: AuthenticatedRequest, res: Response): void;
    static getFileById(req: Request, res: Response): void;
    static uploadFile(req: AuthenticatedRequest, res: Response): void;
    static downloadFile(req: Request, res: Response): void;
    static updateFile(req: Request, res: Response): void;
    static deleteFile(req: AuthenticatedRequest, res: Response): void;
    static getPublicFile(req: Request, res: Response): void;
}
export {};
//# sourceMappingURL=files.d.ts.map