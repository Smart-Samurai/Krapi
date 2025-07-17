import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth";
import { ApiResponse } from "../types";
import database from "../services/database";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
    permissions: string[];
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  console.log("Auth middleware - token:", token ? "present" : "missing");
  console.log("Auth middleware - headers:", req.headers);

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: "Access token required",
    };
    res.status(401).json(response);
    return;
  }

  const payload = AuthService.verifyToken(token);

  if (!payload) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid or expired token",
    };
    res.status(403).json(response);
    return;
  }

  // Get full user details including permissions
  const user = database.getUserById(payload.userId);
  if (!user || !user.active) {
    const response: ApiResponse = {
      success: false,
      error: "User not found or inactive",
    };
    res.status(403).json(response);
    return;
  }

  req.user = {
    userId: user.id!,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
  };
  next();
};

// Permission checking middleware
export const requirePermission = (requiredPermission: string) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      res.status(401).json(response);
      return;
    }

    if (
      !req.user.permissions.includes(requiredPermission) &&
      req.user.role !== "admin"
    ) {
      const response: ApiResponse = {
        success: false,
        error: `Insufficient permissions. Required: ${requiredPermission}`,
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

// Role checking middleware
export const requireRole = (requiredRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      res.status(401).json(response);
      return;
    }

    if (!requiredRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: `Insufficient role. Required one of: ${requiredRoles.join(
          ", "
        )}`,
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};
