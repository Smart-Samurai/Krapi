import { Request, Response } from "express";
import CoreDatabaseService from "../services/core-database";
import { ApiResponse, User } from "../types/core";

const coreDatabase = new CoreDatabaseService();

export class UsersController {
  // Get all admin users
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = coreDatabase.getAllUsers();

      // Filter to only show admin users (master_admin, admin, project_admin, limited_admin)
      const adminUsers = users.filter(
        (user: User) =>
          user.role === "master_admin" ||
          user.role === "admin" ||
          user.role === "project_admin" ||
          user.role === "limited_admin"
      );

      const response: ApiResponse = {
        success: true,
        data: adminUsers,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ UsersController.getAllUsers error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch admin users",
      };
      res.status(500).json(response);
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      const user = coreDatabase.getUserById(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ UsersController.getUserById error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch user",
      };
      res.status(500).json(response);
    }
  }

  // Get admin user stats
  static async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      const users = coreDatabase.getAllUsers();

      // Filter to only admin users
      const adminUsers = users.filter(
        (user: User) =>
          user.role === "master_admin" ||
          user.role === "admin" ||
          user.role === "project_admin" ||
          user.role === "limited_admin"
      );

      const stats = {
        total: adminUsers.length,
        active: adminUsers.filter((u: User) => u.active).length,
        masterAdmins: adminUsers.filter((u: User) => u.role === "master_admin")
          .length,
        inactive: adminUsers.filter((u: User) => !u.active).length,
      };

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ UsersController.getAdminStats error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch admin stats",
      };
      res.status(500).json(response);
    }
  }
}
