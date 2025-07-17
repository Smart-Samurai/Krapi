/**
 * Authentication Controller
 * 
 * This controller handles all HTTP requests related to authentication.
 * It acts as the interface between the Express routes and the AuthService,
 * managing request validation, response formatting, and error handling.
 */

import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { 
  createErrorResponse, 
  createSuccessResponse, 
  validateRequiredFields 
} from "../../../shared/utils/validation";
import {
  LoginCredentials,
  RegisterUserData,
  LoginResponse,
  RegisterResponse,
  ProfileResponse,
  LogoutResponse,
  PasswordResetResponse,
  AuthError
} from "../types";

export class AuthController {
  /**
   * Handle user login
   * POST /auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, rememberMe }: LoginCredentials = req.body;

      // Validate required fields
      const validation = validateRequiredFields(req.body, ["username", "password"]);
      if (!validation.valid) {
        const { response, statusCode } = createErrorResponse(
          `Missing required fields: ${validation.missing.join(", ")}`,
          400
        );
        res.status(statusCode).json(response);
        return;
      }

      // Attempt login
      const result = await AuthService.login({ username, password, rememberMe });
      
      if (!result) {
        const { response, statusCode } = createErrorResponse(
          "Invalid username or password",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      // Success response
      const response: LoginResponse = createSuccessResponse(result, "Login successful");
      res.json(response);

    } catch (error) {
      console.error("Login controller error:", error);
      
      if (error instanceof Error) {
        if (error.message === AuthError.ACCOUNT_LOCKED) {
          const { response, statusCode } = createErrorResponse(
            "Account temporarily locked due to too many failed attempts",
            423
          );
          res.status(statusCode).json(response);
          return;
        }
      }

      const { response, statusCode } = createErrorResponse(
        "An error occurred during login",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Handle user registration
   * POST /auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterUserData = req.body;

      // Validate required fields
      const validation = validateRequiredFields(req.body, ["username", "email", "password"]);
      if (!validation.valid) {
        const { response, statusCode } = createErrorResponse(
          `Missing required fields: ${validation.missing.join(", ")}`,
          400
        );
        res.status(statusCode).json(response);
        return;
      }

      // Register user
      const user = await AuthService.register(userData);

      // Success response
      const response: RegisterResponse = createSuccessResponse(
        user, 
        "User registered successfully"
      );
      res.status(201).json(response);

    } catch (error) {
      console.error("Registration controller error:", error);
      
      if (error instanceof Error) {
        if (error.message === AuthError.USER_ALREADY_EXISTS) {
          const { response, statusCode } = createErrorResponse(
            "Username already exists",
            409
          );
          res.status(statusCode).json(response);
          return;
        }

        if (error.message.includes("Email already registered")) {
          const { response, statusCode } = createErrorResponse(
            "Email already registered",
            409
          );
          res.status(statusCode).json(response);
          return;
        }

        if (error.message.includes("Password must")) {
          const { response, statusCode } = createErrorResponse(
            error.message,
            400
          );
          res.status(statusCode).json(response);
          return;
        }
      }

      const { response, statusCode } = createErrorResponse(
        "An error occurred during registration",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Handle user logout
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        const { response, statusCode } = createErrorResponse(
          "No token provided",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      await AuthService.logout(token);

      const response: LogoutResponse = createSuccessResponse(
        { message: "Logged out successfully" },
        "Logout successful"
      );
      res.json(response);

    } catch (error) {
      console.error("Logout controller error:", error);
      
      const { response, statusCode } = createErrorResponse(
        "An error occurred during logout",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        const { response, statusCode } = createErrorResponse(
          "No token provided",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      const user = await AuthService.verifyToken(token);
      
      if (!user) {
        const { response, statusCode } = createErrorResponse(
          "Invalid or expired token",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      const response: ProfileResponse = createSuccessResponse(user);
      res.json(response);

    } catch (error) {
      console.error("Profile controller error:", error);
      
      const { response, statusCode } = createErrorResponse(
        "An error occurred while fetching profile",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Change user password
   * PUT /auth/password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const token = req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        const { response, statusCode } = createErrorResponse(
          "No token provided",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      // Validate required fields
      const validation = validateRequiredFields(req.body, ["currentPassword", "newPassword"]);
      if (!validation.valid) {
        const { response, statusCode } = createErrorResponse(
          `Missing required fields: ${validation.missing.join(", ")}`,
          400
        );
        res.status(statusCode).json(response);
        return;
      }

      // Verify token and get user
      const user = await AuthService.verifyToken(token);
      if (!user) {
        const { response, statusCode } = createErrorResponse(
          "Invalid or expired token",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      // Change password
      await AuthService.changePassword(user.id, currentPassword, newPassword);

      const response: PasswordResetResponse = createSuccessResponse(
        { message: "Password changed successfully" },
        "Password updated"
      );
      res.json(response);

    } catch (error) {
      console.error("Change password controller error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("Current password is incorrect")) {
          const { response, statusCode } = createErrorResponse(
            "Current password is incorrect",
            400
          );
          res.status(statusCode).json(response);
          return;
        }

        if (error.message.includes("Password must")) {
          const { response, statusCode } = createErrorResponse(
            error.message,
            400
          );
          res.status(statusCode).json(response);
          return;
        }
      }

      const { response, statusCode } = createErrorResponse(
        "An error occurred while changing password",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Verify if a token is valid
   * GET /auth/verify
   */
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        const { response, statusCode } = createErrorResponse(
          "No token provided",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      const user = await AuthService.verifyToken(token);
      
      if (!user) {
        const { response, statusCode } = createErrorResponse(
          "Invalid or expired token",
          401
        );
        res.status(statusCode).json(response);
        return;
      }

      const response = createSuccessResponse(
        { valid: true, user },
        "Token is valid"
      );
      res.json(response);

    } catch (error) {
      console.error("Token verification controller error:", error);
      
      const { response, statusCode } = createErrorResponse(
        "An error occurred during token verification",
        500
      );
      res.status(statusCode).json(response);
    }
  }

  /**
   * Health check for authentication service
   * GET /auth/health
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const response = createSuccessResponse(
        { 
          status: "healthy",
          service: "authentication",
          timestamp: new Date().toISOString()
        },
        "Authentication service is healthy"
      );
      res.json(response);

    } catch (error) {
      console.error("Auth health check error:", error);
      
      const { response, statusCode } = createErrorResponse(
        "Authentication service is unhealthy",
        503
      );
      res.status(statusCode).json(response);
    }
  }
}