import { AuthPayload, User } from "../types";
export declare class AuthService {
    static generateToken(payload: AuthPayload): string;
    static verifyToken(token: string): AuthPayload | null;
    static login(username: string, password: string): Promise<{
        user: Omit<User, "password">;
        token: string;
    } | null>;
    static changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
    static createUser(userData: {
        username: string;
        password: string;
        email?: string;
        role?: "admin" | "editor" | "viewer";
        permissions?: string[];
    }): Promise<Omit<User, "password"> | null>;
    private static getDefaultPermissionsForRole;
    static getAllUsers(): Promise<Omit<User, "password">[]>;
}
//# sourceMappingURL=auth.d.ts.map