import { AuthPayload, User } from "../types/core";
export declare class AuthService {
    static generateToken(payload: AuthPayload): string;
    static verifyToken(token: string): AuthPayload | null;
    static login(username: string, password: string): Promise<{
        user: Omit<User, "password_hash">;
        token: string;
    } | null>;
    static createUser(userData: {
        username: string;
        email: string;
        password: string;
        role?: "admin" | "user";
        active?: boolean;
    }): Promise<Omit<User, "password_hash"> | null>;
    static getAllUsers(): Promise<Omit<User, "password_hash">[]>;
}
//# sourceMappingURL=auth.d.ts.map