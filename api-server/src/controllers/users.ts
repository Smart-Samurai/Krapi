import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { ApiResponse, UpdateUserRequest } from "../types";
import database from "../services/database";
import bcrypt from "bcryptjs";

export class UserController {
  static async getAllUsers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const users = database.getAllUsers();

      // Remove passwords from response
      const safeUsers = users.map((user) => {
        const { password: _password, ...safeUser } = user;
        return safeUser;
      });

      const response: ApiResponse = {
        success: true,
        data: safeUsers,
        message: `Retrieved ${users.length} users`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all users error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve users",
      };
      res.status(500).json(response);
    }
  }

  static async getUserById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      const user = database.getUserById(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: `User with ID '${userId}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const { password: _password, ...safeUser } = user;

      const response: ApiResponse = {
        success: true,
        data: { user: safeUser },
        message: `Retrieved user with ID '${userId}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get user by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve user",
      };
      res.status(500).json(response);
    }
  }

  static async updateUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const updates: UpdateUserRequest = req.body;

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      // Check if user exists
      const existingUser = database.getUserById(userId);
      if (!existingUser) {
        const response: ApiResponse = {
          success: false,
          error: `User with ID '${userId}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // Check if username is already taken by another user
      if (updates.username) {
        const userWithSameUsername = database.getUserByUsername(
          updates.username
        );
        if (userWithSameUsername && userWithSameUsername.id !== userId) {
          const response: ApiResponse = {
            success: false,
            error: "Username already exists",
          };
          res.status(400).json(response);
          return;
        }
      }

      const updatedUser = database.updateUser(userId, updates);

      if (!updatedUser) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to update user",
        };
        res.status(500).json(response);
        return;
      }

      const { password: _password, ...safeUser } = updatedUser;

      const response: ApiResponse = {
        success: true,
        data: { user: safeUser },
        message: `User with ID '${userId}' updated successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update user error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update user",
      };
      res.status(500).json(response);
    }
  }

  static async deleteUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const currentUserId = req.user?.userId;

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      // Prevent users from deleting themselves
      if (userId === currentUserId) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot delete your own account",
        };
        res.status(400).json(response);
        return;
      }

      const deleted = database.deleteUser(userId);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: `User with ID '${userId}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `User with ID '${userId}' deleted successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Delete user error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete user",
      };
      res.status(500).json(response);
    }
  }

  static async updateUserPassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      if (!password || password.length < 6) {
        const response: ApiResponse = {
          success: false,
          error: "Password must be at least 6 characters long",
        };
        res.status(400).json(response);
        return;
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const updated = database.updateUserPassword(userId, hashedPassword);

      if (!updated) {
        const response: ApiResponse = {
          success: false,
          error: `User with ID '${userId}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `Password updated successfully for user ID '${userId}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update user password error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update password",
      };
      res.status(500).json(response);
    }
  }

  static async toggleUserStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      const currentUserId = req.user?.userId;

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid user ID",
        };
        res.status(400).json(response);
        return;
      }

      // Prevent users from deactivating themselves
      if (userId === currentUserId) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot deactivate your own account",
        };
        res.status(400).json(response);
        return;
      }

      const user = database.getUserById(userId);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: `User with ID '${userId}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const updatedUser = database.updateUser(userId, { active: !user.active });

      if (!updatedUser) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to update user status",
        };
        res.status(500).json(response);
        return;
      }

      const { password: _password, ...safeUser } = updatedUser;

      const response: ApiResponse = {
        success: true,
        data: { user: safeUser },
        message: `User ${
          updatedUser.active ? "activated" : "deactivated"
        } successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Toggle user status error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update user status",
      };
      res.status(500).json(response);
    }
  }

  static async createUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        role = "user",
        active = true,
      } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        const response: ApiResponse = {
          success: false,
          error: "Username, email, and password are required",
        };
        res.status(400).json(response);
        return;
      }

      // Check if username already exists
      const existingUser = database.getUserByUsername(username);
      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          error: "Username already exists",
        };
        res.status(400).json(response);
        return;
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      const newUser = database.createUser({
        username,
        email,
        password: hashedPassword,
        role,
        active,
        permissions: [], // Add default permissions
      });

      if (!newUser) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to create user",
        };
        res.status(500).json(response);
        return;
      }

      const { password: _password, ...safeUser } = newUser;

      const response: ApiResponse = {
        success: true,
        data: { user: safeUser },
        message: "User created successfully",
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Create user error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to create user",
      };
      res.status(500).json(response);
    }
  }

  static async getUserStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      console.log("getUserStats called by user:", req.user);
      const users = database.getAllUsers();
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      // Calculate today's statistics
      const newUsersToday = users.filter((user) => {
        const createdDate = new Date(user.created_at || "");
        return createdDate >= todayStart;
      }).length;

      const activeUsers = users.filter((user) => user.active).length;
      const lockedUsers = users.filter((user) => !user.active).length;
      const unverifiedUsers = 0; // Since email_verified is not in the User interface

      // Mock session and login data (in a real app, this would come from session/log tables)
      const activeSessions = Math.floor(Math.random() * 50) + 10; // Mock active sessions
      const loginsToday = Math.floor(Math.random() * 100) + 20; // Mock logins today
      const loginAttemptsToday = Math.floor(loginsToday * 1.2); // Mock login attempts
      const failedLoginsToday = Math.floor(loginAttemptsToday * 0.1); // Mock failed logins

      const authStats = {
        total_users: users.length,
        active_users: activeUsers,
        locked_users: lockedUsers,
        unverified_users: unverifiedUsers,
        new_users_today: newUsersToday,
        users_today: loginsToday, // Users who logged in today
        login_attempts_today: loginAttemptsToday,
        logins_today: loginsToday,
        failed_logins_today: failedLoginsToday,
        active_sessions: activeSessions,
        sessions_active: activeSessions, // Alternative naming for compatibility
      };

      const response: ApiResponse = {
        success: true,
        data: authStats,
        message: "Auth statistics retrieved successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Get user stats error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve auth statistics",
      };
      res.status(500).json(response);
    }
  }
}
