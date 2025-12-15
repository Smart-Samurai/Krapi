import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AdminApiLoginHandler } from "./handlers/auth/admin-api-login.handler";
import { AdminLoginHandler } from "./handlers/auth/admin-login.handler";
import { ChangePasswordHandler } from "./handlers/auth/change-password.handler";
import { CreateAdminSessionHandler } from "./handlers/auth/create-admin-session.handler";
import { CreateProjectSessionHandler } from "./handlers/auth/create-project-session.handler";
import { GetCurrentUserHandler } from "./handlers/auth/get-current-user.handler";
import { LogoutHandler } from "./handlers/auth/logout.handler";
import { RegisterHandler } from "../routes/handlers/auth/register.handler";
import { RefreshSessionHandler } from "./handlers/auth/refresh-session.handler";
import { RegenerateApiKeyHandler } from "./handlers/auth/regenerate-api-key.handler";
import { ValidateSessionHandler } from "./handlers/auth/validate-session.handler";

import { ApiResponse } from "@/types";

/**
 * Authentication Controller
 *
 * Handles all authentication-related HTTP requests including:
 * - Admin and project session creation
 * - User login/logout
 * - Password management
 * - API key regeneration
 * - Session validation
 *
 * Follows SDK-first architecture: all methods use BackendSDK when available.
 *
 * This controller now delegates to specialized handlers for each operation.
 *
 * @class AuthController
 * @example
 * const controller = new AuthController();
 * controller.setBackendSDK(backendSDK);
 * // Controller is ready to handle authentication requests
 */
export class AuthController {
  // Handlers
  private createAdminSessionHandler?: CreateAdminSessionHandler;
  private createProjectSessionHandler?: CreateProjectSessionHandler;
  private adminLoginHandler?: AdminLoginHandler;
  private validateSessionHandler?: ValidateSessionHandler;
  private logoutHandler?: LogoutHandler;
  private getCurrentUserHandler?: GetCurrentUserHandler;
  private changePasswordHandler?: ChangePasswordHandler;
  private adminApiLoginHandler?: AdminApiLoginHandler;
  private refreshSessionHandler?: RefreshSessionHandler;
  private regenerateApiKeyHandler?: RegenerateApiKeyHandler;
  private registerHandler?: RegisterHandler;

  /**
   * Set BackendSDK instance for SDK-first architecture
   *
   * @param {BackendSDK} sdk - BackendSDK instance
   * @returns {void}
   */
  setBackendSDK(sdk: BackendSDK): void {
    // Initialize handlers
    this.createAdminSessionHandler = new CreateAdminSessionHandler(sdk);
    this.createProjectSessionHandler = new CreateProjectSessionHandler(sdk);
    this.adminLoginHandler = new AdminLoginHandler(sdk);
    this.validateSessionHandler = new ValidateSessionHandler(sdk);
    this.logoutHandler = new LogoutHandler(sdk);
    this.getCurrentUserHandler = new GetCurrentUserHandler(sdk);
    this.changePasswordHandler = new ChangePasswordHandler(sdk);
    this.adminApiLoginHandler = new AdminApiLoginHandler(sdk);
    this.refreshSessionHandler = new RefreshSessionHandler(sdk);
    this.regenerateApiKeyHandler = new RegenerateApiKeyHandler(sdk);
    this.registerHandler = new RegisterHandler(sdk);
  }

  // Session management - delegate to handlers
  createAdminSession = async (req: Request, res: Response): Promise<void> => {
    if (!this.createAdminSessionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.createAdminSessionHandler.handle(req, res);
  };

  createProjectSession = async (req: Request, res: Response): Promise<void> => {
    if (!this.createProjectSessionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.createProjectSessionHandler.handle(req, res);
  };

  // Authentication - delegate to handlers
  adminLogin = async (req: Request, res: Response): Promise<void> => {
    if (!this.adminLoginHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.adminLoginHandler.handle(req, res);
  };

  adminApiLogin = async (req: Request, res: Response): Promise<void> => {
    if (!this.adminApiLoginHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.adminApiLoginHandler.handle(req, res);
  };

  // Session operations - delegate to handlers
  validateSession = async (req: Request, res: Response): Promise<void> => {
    if (!this.validateSessionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.validateSessionHandler.handle(req, res);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    if (!this.logoutHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.logoutHandler.handle(req, res);
  };

  refreshSession = async (req: Request, res: Response): Promise<void> => {
    if (!this.refreshSessionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.refreshSessionHandler.handle(req, res);
  };

  // User operations - delegate to handlers
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    if (!this.getCurrentUserHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getCurrentUserHandler.handle(req, res);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    if (!this.changePasswordHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.changePasswordHandler.handle(req, res);
  };

  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    if (!this.regenerateApiKeyHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.regenerateApiKeyHandler.handle(req, res);
  };

  register = async (req: Request, res: Response): Promise<void> => {
    if (!this.registerHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.registerHandler.handle(req, res);
  };
}
