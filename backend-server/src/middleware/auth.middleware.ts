import { Request, Response, NextFunction } from "express";

import { AuthService } from "@/services/auth.service";
import { DatabaseService } from "@/services/database.service";
import {
  AuthenticatedRequest,
  Scope,
  ScopeRequirement,
  BackendApiKey,
  AdminRole,
} from "@/types";

const authService = AuthService.getInstance();
const db = DatabaseService.getInstance();

/**
 * Authenticate request using Bearer token or API key
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "Authorization header required",
      });
      return;
    }

    let token: string;
    let isApiKey = false;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (authHeader.startsWith("ApiKey ")) {
      token = authHeader.substring(7);
      isApiKey = true;
    } else {
      res.status(401).json({
        success: false,
        error: "Invalid authorization format",
      });
      return;
    }

    if (isApiKey) {
      // Handle API key authentication
      const apiKey = (await db.getApiKey(token)) as unknown as BackendApiKey;

      if (!apiKey || apiKey.status !== "active") {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        });
        return;
      }

      // Check if API key is expired
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        res.status(401).json({
          success: false,
          error: "API key expired",
        });
        return;
      }

      // Get owner details
      let userId: string;
      let _userType: "admin" | "project"; // Unused variable
      let projectId: string | undefined;

      // Check if it's an admin API key (has no project_id) or project API key
      if (!apiKey.project_id) {
        userId = apiKey.user_id;
        _userType = "admin";

        // Verify admin user exists and is active
        const adminUser = await db.getAdminUserById(userId);
        if (!adminUser || !adminUser.active) {
          res.status(401).json({
            success: false,
            error: "Admin user not found or inactive",
          });
          return;
        }
      } else {
        // Project API key
        projectId = apiKey.project_id;
        _userType = "project";

        // Verify project exists and is active
        const project = await db.getProjectById(projectId);
        if (!project || !project.active) {
          res.status(401).json({
            success: false,
            error: "Project not found or inactive",
          });
          return;
        }

        // For project API keys, use the project ID as the user ID to maintain proper context
        userId = projectId;
      }

      // Get user scopes for admin users
      let userScopes: string[] = [];
      if (!projectId) {
        const adminUser = await db.getAdminUserById(userId);
        if (adminUser) {
          const authService = AuthService.getInstance();
          userScopes = authService
            .getScopesForRole(adminUser.role)
            .map((scope) => scope.toString());
        }
      }

      (req as AuthenticatedRequest).user = {
        id: userId,
        project_id: projectId,
        scopes: userScopes,
      };
      (req as AuthenticatedRequest).apiKey = apiKey;
    } else {
      // Handle session token authentication
      const result = await authService.validateSessionToken(token);

      if (!result.valid || !result.session) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        });
        return;
      }

      const session = result.session;

      // For project sessions, user_id might be null
      // In such cases, use the session id as the user identifier
      const userId = session.user_id || session.id;

      // Get user scopes for admin users
      let userScopes: string[] = [];
      if (session.type === "admin" && session.user_id) {
        const adminUser = await db.getAdminUserById(session.user_id);
        if (adminUser) {
          const authService = AuthService.getInstance();
          userScopes = authService
            .getScopesForRole(adminUser.role)
            .map((scope) => scope.toString());
          console.log(
            `🔍 [AUTH DEBUG] Admin user ${adminUser.username} has role: ${
              adminUser.role
            }, scopes: ${userScopes.join(", ")}`
          );
        }
      } else if (session.type === "project" && session.scopes) {
        userScopes = session.scopes.map((scope) => scope.toString());
      }

      (req as AuthenticatedRequest).user = {
        id: userId,
        project_id: session.project_id,
        scopes: userScopes,
      };
      (req as AuthenticatedRequest).session = session;
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

/**
 * Require specific scopes for access
 */
export const requireScopes = (requirement: ScopeRequirement) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const userScopes = authReq.user.scopes || [];

    // Master scope bypasses all checks
    if (userScopes.includes(Scope.MASTER)) {
      next();
      return;
    }

    // Check if project-specific scope is required
    if (requirement.projectSpecific) {
      const projectId = req.params.projectId || authReq.user.project_id;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID required",
        });
        return;
      }

      // For API keys with limited project access
      if (
        authReq.apiKey?.project_id &&
        authReq.apiKey.project_id !== projectId
      ) {
        res.status(403).json({
          success: false,
          error: "Access denied to this project",
        });
        return;
      }
    }

    // Check required scopes
    let hasAccess = false;

    if (requirement.requireAll) {
      // All scopes required
      hasAccess = requirement.scopes.every((scope) =>
        userScopes.includes(scope)
      );
    } else {
      // Any scope is sufficient
      hasAccess = requirement.scopes.some((scope) =>
        userScopes.includes(scope)
      );
    }

    if (!hasAccess) {
      console.log(
        `🔍 [SCOPE DEBUG] Access denied. Required: ${requirement.scopes.join(
          ", "
        )}, User has: ${userScopes.join(", ")}`
      );
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        required_scopes: requirement.scopes,
        user_scopes: userScopes,
      });
      return;
    }

    console.log(
      `✅ [SCOPE DEBUG] Access granted for scopes: ${requirement.scopes.join(
        ", "
      )}`
    );

    next();
  };
};

/**
 * Shorthand middleware for common scope requirements
 */
export const requireAdmin = requireScopes({
  scopes: [Scope.ADMIN_READ],
  requireAll: false,
});

export const requireProjectAccess = requireScopes({
  scopes: [Scope.PROJECTS_READ],
  requireAll: false,
  projectSpecific: true,
});

export const requireCollectionRead = requireScopes({
  scopes: [Scope.COLLECTIONS_READ],
  requireAll: false,
  projectSpecific: true,
});

export const requireCollectionWrite = requireScopes({
  scopes: [Scope.COLLECTIONS_WRITE],
  requireAll: false,
  projectSpecific: true,
});

export const requireDocumentRead = requireScopes({
  scopes: [Scope.DOCUMENTS_READ],
  requireAll: false,
  projectSpecific: true,
});

export const requireDocumentWrite = requireScopes({
  scopes: [Scope.DOCUMENTS_WRITE],
  requireAll: false,
  projectSpecific: true,
});

export const requireStorageRead = requireScopes({
  scopes: [Scope.STORAGE_READ],
  requireAll: false,
  projectSpecific: true,
});

export const requireStorageWrite = requireScopes({
  scopes: [Scope.STORAGE_WRITE],
  requireAll: false,
  projectSpecific: true,
});

// Legacy exports for backward compatibility
export const authenticateJWT = authenticate;
export const authenticateAdmin = authenticate;
export const authenticateProject = authenticate;
