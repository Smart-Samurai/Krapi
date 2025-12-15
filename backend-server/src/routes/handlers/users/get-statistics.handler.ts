import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";

/**
 * Handler for getting user statistics
 * GET /krapi/k1/projects/:projectId/users/statistics
 *
 * Returns project-wide user statistics (total users, active users, users by role, recent logins).
 * This is NOT user-specific - it returns aggregate statistics for all users in the project.
 */
export class GetUserStatisticsHandler {
  constructor(_backendSDK: BackendSDK) {
    // BackendSDK parameter kept for consistency with other handlers, but not used here
    // We use DatabaseService directly for querying project_users table
    void _backendSDK;
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      // Get database service to query project_users table using public methods
      const dbService = DatabaseService.getInstance();

      // Query project_users table for statistics using public queryProject method
      // Total users
      const totalUsersResult = await dbService.queryProject(
        projectId,
        "SELECT COUNT(*) as count FROM project_users",
        []
      );
      const totalUsers = parseInt(String(totalUsersResult.rows[0]?.count || 0));

      // Active users (where is_active = 1)
      const activeUsersResult = await dbService.queryProject(
        projectId,
        "SELECT COUNT(*) as count FROM project_users WHERE is_active = 1",
        []
      );
      const activeUsers = parseInt(
        String(activeUsersResult.rows[0]?.count || 0)
      );

      // Users by role
      const usersByRoleResult = await dbService.queryProject(
        projectId,
        "SELECT role, COUNT(*) as count FROM project_users GROUP BY role",
        []
      );
      const usersByRole: Record<string, number> = {};
      usersByRoleResult.rows.forEach((row) => {
        const typedRow = row as { role: string; count: unknown };
        const role = typedRow.role || "user"; // Default to "user" if role is null
        usersByRole[role] = parseInt(String(typedRow.count || 0));
      });

      // Recent logins (last 30 days) - approximate based on updated_at
      const recentLoginsResult = await dbService.queryProject(
        projectId,
        `SELECT COUNT(*) as count FROM project_users 
         WHERE updated_at >= datetime('now', '-30 days') 
         OR last_login >= datetime('now', '-30 days')`,
        []
      );
      const recentLogins = parseInt(
        String(recentLoginsResult.rows[0]?.count || 0)
      );

      // Return project-wide statistics
      const statistics = {
        total_users: totalUsers,
        active_users: activeUsers,
        users_by_role: usersByRole,
        recent_logins: recentLogins,
      };

      // Log the response for debugging
      console.log("[BACKEND] User statistics response:", {
        projectId,
        statistics,
        responseFormat: { success: true, data: statistics },
      });

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Get user statistics error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get user statistics",
      });
    }
  }
}
