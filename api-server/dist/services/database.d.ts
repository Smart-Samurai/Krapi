import { ContentItem, User, ContentRoute, FileUpload, Role, ContentSchema, EmailTemplate, EmailLog, NotificationPreferences, ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest, ApiEndpoint, CreateApiEndpointRequest, UpdateApiEndpointRequest, RateLimit, CreateRateLimitRequest, UpdateRateLimitRequest, ApiStats } from "../types";
declare class DatabaseService {
    private db;
    private parseJsonFields;
    constructor();
    private initializeTables;
    private seedDefaultData;
    private seedDefaultEmailTemplates;
    getAllContent(routePath?: string, contentType?: string): ContentItem[];
    getContentByKey(key: string): ContentItem | null;
    getContentByKeyAndRoute(key: string, routePath: string): ContentItem | null;
    createContent(item: Omit<ContentItem, "id" | "created_at" | "updated_at">): ContentItem;
    updateContent(key: string, updates: Partial<ContentItem>): ContentItem | null;
    updateContentById(id: number, updates: Partial<ContentItem>): ContentItem | null;
    deleteContent(key: string): boolean;
    deleteContentById(id: number): boolean;
    getContentById(id: number): ContentItem | null;
    getAllRoutes(): ContentRoute[];
    getRouteByPath(path: string): ContentRoute | null;
    getRouteById(id: number): ContentRoute | null;
    createRoute(route: Omit<ContentRoute, "id" | "created_at" | "updated_at">): ContentRoute;
    updateRoute(path: string, updates: Partial<ContentRoute>): ContentRoute | null;
    deleteRoute(path: string): boolean;
    getNestedRoutes(parentId?: number): ContentRoute[];
    getUserByUsername(username: string): User | null;
    getUserById(id: number): User | null;
    getAllUsers(): User[];
    createUser(userData: Omit<User, "id" | "created_at">): User | null;
    updateUser(id: number, updates: Partial<User>): User | null;
    deleteUser(id: number): boolean;
    updateUserPassword(userId: number, hashedPassword: string): boolean;
    getAllFiles(uploadedBy?: number, accessLevel?: string): FileUpload[];
    getFileById(id: number): FileUpload | null;
    getFileByFilename(filename: string): FileUpload | null;
    createFile(fileData: Omit<FileUpload, "id" | "created_at">): FileUpload;
    deleteFile(id: number): boolean;
    getAllRoles(): Role[];
    getRoleByName(name: string): Role | null;
    getAllSchemas(): ContentSchema[];
    getSchemaById(id: number): ContentSchema | null;
    getSchemaByName(name: string): ContentSchema | null;
    createSchema(schema: Omit<ContentSchema, "id" | "created_at" | "updated_at">): ContentSchema;
    updateSchema(id: number, updates: Partial<ContentSchema>): ContentSchema | null;
    deleteSchema(id: number): boolean;
    isSchemaInUse(schemaId: number): boolean;
    private generateMissingUUIDs;
    close(): void;
    /**
     * Get all tables in the database with their row counts and detailed column info
     */
    getAllTables(): {
        name: string;
        rowCount: number;
        columns: Array<{
            name: string;
            type: string;
            nullable: boolean;
            defaultValue?: string;
            primaryKey: boolean;
        }>;
    }[];
    /**
     * Check if a table name is valid (to prevent SQL injection)
     */
    isValidTableName(tableName: string): boolean;
    /**
     * Get data from a specific table
     */
    getTableData(tableName: string, limit?: number): {
        columns: string[];
        rows: any[];
    };
    /**
     * Execute a custom SQL query
     */
    executeQuery(query: string): {
        columns: string[];
        rows: any[];
    };
    /**
     * Export the entire database as a JSON object
     */
    exportDatabase(): Record<string, any[]>;
    /**
     * Reinitialize the database after reset
     */
    reinitialize(): void;
    getEmailSettings(): Array<{
        key: string;
        value: string;
        description?: string;
        category: string;
        encrypted: boolean;
    }>;
    setEmailSetting(key: string, value: string, description?: string, category?: string, encrypted?: boolean): void;
    getEmailSetting(key: string): string | null;
    getAllEmailTemplates(): Array<EmailTemplate>;
    getEmailTemplateById(id: number): EmailTemplate | null;
    getEmailTemplateByName(name: string): EmailTemplate | null;
    createEmailTemplate(template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">): EmailTemplate;
    updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): EmailTemplate | null;
    deleteEmailTemplate(id: number): boolean;
    createEmailLog(log: Omit<EmailLog, "id" | "created_at">): EmailLog;
    getEmailLogById(id: number): EmailLog | null;
    getEmailLogs(page?: number, limit?: number, status?: string): {
        logs: EmailLog[];
        total: number;
        page: number;
        limit: number;
    };
    getEmailStats(startDate?: string, endDate?: string): {
        total: number;
        sent: number;
        failed: number;
        opened: number;
        clicked: number;
        bounced: number;
    };
    getNotificationPreferences(userId: number): NotificationPreferences | null;
    setNotificationPreferences(preferences: Omit<NotificationPreferences, "id" | "created_at" | "updated_at">): NotificationPreferences;
    getUsersWithNotificationPreference(type: "user_created" | "content_updated" | "system_alert"): Array<User & {
        email: string;
    }>;
    getApiKeys(): ApiKey[];
    getApiKeyById(id: string): ApiKey | null;
    createApiKey(apiKey: CreateApiKeyRequest): ApiKey;
    updateApiKey(id: string, updates: UpdateApiKeyRequest): ApiKey | null;
    deleteApiKey(id: string): boolean;
    getApiEndpoints(): ApiEndpoint[];
    createApiEndpoint(endpoint: CreateApiEndpointRequest): ApiEndpoint;
    updateApiEndpoint(id: string, updates: UpdateApiEndpointRequest): ApiEndpoint | null;
    getApiEndpointById(id: string): ApiEndpoint | null;
    deleteApiEndpoint(id: string): boolean;
    /**
     * Track an API request to update statistics
     */
    trackApiRequest(method: string, path: string, responseTime: number, statusCode: number): void;
    getApiStats(): ApiStats;
    getRateLimits(): RateLimit[];
    createRateLimit(rateLimit: CreateRateLimitRequest): RateLimit;
    updateRateLimit(id: string, updates: UpdateRateLimitRequest): RateLimit | null;
    getRateLimitById(id: string): RateLimit | null;
    deleteRateLimit(id: string): boolean;
    seedDefaultApiData(): void;
    seedSampleNotifications(): void;
    /**
     * Search across multiple content types
     */
    search(query: string, limit?: number): any[];
    createNotification(notification: {
        user_id: number;
        type: string;
        title: string;
        message: string;
        data?: Record<string, unknown>;
    }): number;
    getUserNotifications(userId: number, limit?: number, unreadOnly?: boolean): any[];
    getUnreadNotificationCount(userId: number): number;
    markNotificationAsRead(notificationId: number, userId: number): boolean;
    markAllNotificationsAsRead(userId: number): number;
    deleteNotification(notificationId: number, userId: number): boolean;
    createActivityNotification(type: string, title: string, message: string, data?: Record<string, unknown>): void;
    getLoginLogs(page?: number, limit?: number): {
        logs: Array<{
            id: number;
            username: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
            timestamp: string;
            location?: string;
            failure_reason?: string;
        }>;
        total: number;
        page: number;
        limit: number;
    };
    createLoginLog(log: {
        username: string;
        ip_address: string;
        user_agent?: string;
        success: boolean;
        location?: string;
        failure_reason?: string;
    }): void;
    getActiveSessions(): Array<{
        id: string;
        user_id: number;
        username: string;
        ip_address: string;
        user_agent: string;
        created_at: string;
        last_activity: string;
        expires_at: string;
        active: boolean;
    }>;
}
declare const _default: DatabaseService;
export default _default;
//# sourceMappingURL=database.d.ts.map