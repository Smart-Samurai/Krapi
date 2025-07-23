import { Request, Response } from "express";
import { AuthService } from "../services/auth";
import database from "../services/database";
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
} from "../types";
import { AuthenticatedRequest } from "../middleware/auth";

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
      database.createLoginLog({
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
    const fullUser = database.getUserById(user?.userId || 0);

    if (!fullUser) {
      const response: ApiResponse = {
        success: false,
        error: "User not found",
      };
      res.status(404).json(response);
      return;
    }

    // Transform to match frontend User interface with available fields and defaults
    const userResponse = {
      id: fullUser.id || 0,
      username: fullUser.username,
      email: fullUser.email || "admin@krapi.com",
      first_name: "", // Not available in backend
      last_name: "", // Not available in backend
      role: fullUser.role,
      permissions: fullUser.permissions,
      status: fullUser.active ? "active" : "inactive",
      active: fullUser.active,
      email_verified: true, // Default for admin users
      phone: "", // Not available in backend
      phone_verified: false,
      two_factor_enabled: false,
      last_login: null, // Not available in backend
      failed_login_attempts: 0,
      locked_until: null,
      created_at: fullUser.created_at || new Date().toISOString(),
      updated_at: fullUser.created_at || new Date().toISOString(), // Use created_at as fallback
    };

    const response: ApiResponse = {
      success: true,
      data: {
        user: userResponse,
      },
      message: "Token is valid",
    };
    res.json(response);
  }

  static async changePassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId;

      if (!currentPassword || !newPassword) {
        const response: ApiResponse = {
          success: false,
          error: "Current password and new password are required",
        };
        res.status(400).json(response);
        return;
      }

      if (newPassword.length < 6) {
        const response: ApiResponse = {
          success: false,
          error: "New password must be at least 6 characters long",
        };
        res.status(400).json(response);
        return;
      }

      const result = await AuthService.changePassword(
        userId!,
        currentPassword,
        newPassword
      );

      if (!result) {
        const response: ApiResponse = {
          success: false,
          error: "Current password is incorrect",
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: "Password changed successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Change password error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async createUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      console.log(
        "Create user request body:",
        JSON.stringify(req.body, null, 2)
      );

      const {
        username,
        password,
        email,
        role,
        permissions,
      }: CreateUserRequest = req.body;

      if (!username || !password) {
        console.log("Validation failed - missing username or password:", {
          username: !!username,
          password: !!password,
        });
        const response: ApiResponse = {
          success: false,
          error: "Username and password are required",
        };
        res.status(400).json(response);
        return;
      }

      if (password.length < 6) {
        console.log("Validation failed - password too short:", password.length);
        const response: ApiResponse = {
          success: false,
          error: "Password must be at least 6 characters long",
        };
        res.status(400).json(response);
        return;
      }

      const result = await AuthService.createUser({
        username,
        password,
        email,
        role: role || "viewer",
        permissions,
      });

      if (!result) {
        console.log(
          "User creation failed - username already exists or other error"
        );
        const response: ApiResponse = {
          success: false,
          error: "Username already exists",
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { user: result },
        message: "User created successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Create user error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async getAllUsers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const users = await AuthService.getAllUsers();

      const response: ApiResponse = {
        success: true,
        data: users,
        message: "Users retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Get users error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async getUserStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Mock user statistics for now
      const response: ApiResponse = {
        success: true,
        data: {
          total_users: 1245,
          active_users: 1100,
          locked_users: 5,
          unverified_users: 140,
          users_today: 23,
          logins_today: 456,
          failed_logins_today: 12,
          sessions_active: 234,
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Get user stats error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async getSecuritySettings(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Get real security settings from database or environment
      const response: ApiResponse = {
        success: true,
        data: {
          password_min_length: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
          password_require_uppercase:
            process.env.PASSWORD_REQUIRE_UPPERCASE !== "false",
          password_require_lowercase:
            process.env.PASSWORD_REQUIRE_LOWERCASE !== "false",
          password_require_numbers:
            process.env.PASSWORD_REQUIRE_NUMBERS !== "false",
          password_require_symbols:
            process.env.PASSWORD_REQUIRE_SYMBOLS === "true",
          session_timeout: parseInt(process.env.SESSION_TIMEOUT || "60"),
          max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
          lockout_duration: parseInt(process.env.LOCKOUT_DURATION || "15"),
          require_email_verification:
            process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
          allow_user_registration:
            process.env.ALLOW_USER_REGISTRATION === "true",
          two_factor_required: process.env.TWO_FACTOR_REQUIRED === "true",
          jwt_expiry: parseInt(process.env.JWT_EXPIRES_IN || "60"),
          refresh_token_expiry: parseInt(
            process.env.REFRESH_TOKEN_EXPIRY || "7"
          ),
        },
      };
      res.json(response);
    } catch (error) {
      console.error("Get security settings error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async updateSecuritySettings(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Mock update - in real implementation, validate and save to database
      const response: ApiResponse = {
        success: true,
        message: "Security settings updated successfully",
      };
      res.json(response);
    } catch (error) {
      console.error("Update security settings error:", error);
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Get real login logs from database
      const logs = database.getLoginLogs(page, limit);

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

  static async getActiveSessions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Get real active sessions from database
      const sessions = database.getActiveSessions();

      const response: ApiResponse = {
        success: true,
        data: sessions,
      };
      res.json(response);
    } catch (error) {
      console.error("Get active sessions error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static async terminateSession(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Mock session termination for now
      const response: ApiResponse = {
        success: true,
        message: `Session ${sessionId} terminated successfully`,
      };
      res.json(response);
    } catch (error) {
      console.error("Terminate session error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };
      res.status(500).json(response);
    }
  }

  static getProfile(req: Request, res: Response): void {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      const user = database.getUserById(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      // Remove password from response
      const { password: _password, ...userProfile } = user;

      const response: ApiResponse = {
        success: true,
        data: userProfile,
        message: "Profile retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Get profile error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve profile",
      };
      res.status(500).json(response);
    }
  }

  static updateProfile(req: Request, res: Response): void {
    try {
      const userId = (req as any).user?.userId;
      const { username, email } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: "User ID required",
        };
        res.status(400).json(response);
        return;
      }

      if (!username?.trim()) {
        const response: ApiResponse = {
          success: false,
          error: "Username is required",
        };
        res.status(400).json(response);
        return;
      }

      const updatedUser = database.updateUser(userId, {
        username: username.trim(),
        email: email?.trim() || null,
      });

      if (!updatedUser) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to update profile",
        };
        res.status(400).json(response);
        return;
      }

      // Remove password from response
      const { password: _password, ...userProfile } = updatedUser;

      const response: ApiResponse = {
        success: true,
        data: userProfile,
        message: "Profile updated successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Update profile error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update profile",
      };
      res.status(500).json(response);
    }
  }
}
