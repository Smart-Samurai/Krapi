import { Request, Response } from "express";
import { AuthService } from "../services/auth";
import CoreDatabaseService from "../services/core-database";
import { ApiResponse, LoginRequest, LoginResponse } from "../types/core";
import { AuthenticatedRequest } from "../middleware/auth";

const coreDatabase = new CoreDatabaseService();

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      console.log("🔐 AuthController: Login request received");
      console.log("🔐 AuthController: Request body:", {
        username: req.body.username ? "present" : "missing",
        password: req.body.password ? "present" : "missing",
      });

      const { username, password }: LoginRequest = req.body;

      if (!username || !password) {
        console.log("🔐 AuthController: Missing username or password");
        const response: ApiResponse = {
          success: false,
          error: "Username and password are required",
        };
        res.status(400).json(response);
        return;
      }

      console.log("🔐 AuthController: Calling AuthService.login");
      const result = await AuthService.login(username, password);
      console.log(
        "🔐 AuthController: AuthService result:",
        result ? "success" : "failed"
      );

      // Log the login attempt
      coreDatabase.createLoginLog({
        username,
        ip_address: req.ip || req.connection.remoteAddress || "unknown",
        user_agent: req.headers["user-agent"] as string,
        success: !!result,
        location: "Local Network", // In a real app, you'd geolocate this
        failure_reason: result ? undefined : "Invalid credentials",
      });

      if (!result) {
        console.log("🔐 AuthController: Login failed - invalid credentials");
        const response: ApiResponse = {
          success: false,
          error: "Invalid username or password",
        };
        res.status(401).json(response);
        return;
      }

      console.log("🔐 AuthController: Login successful, sending response");
      const response: LoginResponse = {
        success: true,
        token: result.token,
        user: result.user,
      };

      console.log("🔐 AuthController: Response:", response);
      res.json(response);
    } catch (error) {
      console.error("Login error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async verify(req: AuthenticatedRequest, res: Response): Promise<void> {
    // This endpoint is protected by auth middleware, so if we get here, token is valid
    const user = req.user;

    // Get the full user details from database
    const fullUser = coreDatabase.getUserById(user?.id || 0);

    if (!fullUser) {
      const response: ApiResponse = {
        success: false,
        error: "User not found",
      };
      res.status(404).json(response);
      return;
    }

    // Transform to match frontend User interface
    const userResponse = {
      id: fullUser.id,
      username: fullUser.username,
      email: fullUser.email,
      role: fullUser.role,
      active: fullUser.active,
      created_at: fullUser.created_at,
      updated_at: fullUser.updated_at,
      last_login: fullUser.last_login,
    };

    const response: ApiResponse = {
      success: true,
      data: userResponse,
    };

    res.json(response);
  }

  static async getAllUsers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "Admin access required",
        };
        res.status(403).json(response);
        return;
      }

      const users = coreDatabase.getAllUsers();

      // Remove password hashes from response
      const safeUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
      }));

      const response: ApiResponse = {
        success: true,
        data: safeUsers,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all users error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async getLoginLogs(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "Admin access required",
        };
        res.status(403).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = coreDatabase.getLoginLogs(page, limit);

      const response: ApiResponse = {
        success: true,
        data: logs,
      };

      res.json(response);
    } catch (error) {
      console.error("Get login logs error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async getDatabaseStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "Admin access required",
        };
        res.status(403).json(response);
        return;
      }

      const stats = coreDatabase.getDatabaseStats();

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      console.error("Get database stats error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }
}
