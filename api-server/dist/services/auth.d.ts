import { AuthPayload, User } from "../types/core";
export declare class AuthService {
    static generateToken(payload: AuthPayload): string;
    static verifyToken(token: string): AuthPayload | null;
    static login(email: string, password: string): Promise<{
        user: Omit<User, "password_hash">;
        token: string;
    } | null>;
    static createUser(userData: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        role?: "master_admin" | "admin" | "project_admin" | "limited_admin";
        active?: boolean;
        permissions?: Record<string, boolean>;
    }): Promise<Omit<User, "password_hash"> | null>;
    static getAllUsers(): Promise<Omit<User, "password_hash">[]>;
}
//# sourceMappingURL=auth.d.ts.map