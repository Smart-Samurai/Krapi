import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class ApiManagementController {
    /**
     * Get API statistics and overview
     */
    static getApiStats(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get all API keys
     */
    static getApiKeys(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Create a new API key
     */
    static createApiKey(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Update an existing API key
     */
    static updateApiKey(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Toggle API key active status
     */
    static toggleApiKey(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Delete an API key
     */
    static deleteApiKey(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get all API endpoints
     */
    static getApiEndpoints(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get rate limits
     */
    static getRateLimits(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateEndpoint(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateRateLimit(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=api-management.d.ts.map