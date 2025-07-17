import { Request, Response } from "express";
export declare class ApiController {
    private static db;
    private static generateApiKey;
    static getApiKeys(req: Request, res: Response): Promise<void>;
    static createApiKey(req: Request, res: Response): Promise<void>;
    static updateApiKey(req: Request, res: Response): Promise<void>;
    static deleteApiKey(req: Request, res: Response): Promise<void>;
    static toggleApiKeyStatus(req: Request, res: Response): Promise<void>;
    static regenerateApiKey(req: Request, res: Response): Promise<void>;
    static getApiEndpoints(req: Request, res: Response): Promise<void>;
    static createApiEndpoint(req: Request, res: Response): Promise<void>;
    static updateApiEndpoint(req: Request, res: Response): Promise<void>;
    static deleteApiEndpoint(req: Request, res: Response): Promise<void>;
    static getApiStats(req: Request, res: Response): Promise<void>;
    static getRateLimits(req: Request, res: Response): Promise<void>;
    static createRateLimit(req: Request, res: Response): Promise<void>;
    static updateRateLimit(req: Request, res: Response): Promise<void>;
    static deleteRateLimit(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=api.d.ts.map