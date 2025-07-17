import { Request, Response } from "express";
export declare class ContentController {
    static getAllContent(req: Request, res: Response): void;
    static getContentByKey(req: Request, res: Response): void;
    static getContentById(req: Request, res: Response): void;
    static createContent(req: Request, res: Response): void;
    static updateContent(req: Request, res: Response): void;
    static updateContentById(req: Request, res: Response): void;
    static deleteContent(req: Request, res: Response): void;
    static deleteContentById(req: Request, res: Response): void;
    static getPublicContentByRoute(req: Request, res: Response): void;
    static getPublicContent(req: Request, res: Response): void;
}
//# sourceMappingURL=content.d.ts.map