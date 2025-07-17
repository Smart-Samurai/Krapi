import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthController } from "../../controllers/auth";
import database from "../../services/database";

// Mock dependencies
jest.mock("../../services/database");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const mockDatabase = database as jest.Mocked<typeof database>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock app
const app = express();
app.use(express.json());
app.post("/login", AuthController.login);
app.get("/verify", AuthController.verify);

describe("AuthController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword",
      role: "admin" as const,
      permissions: ["read", "write"],
      active: true,
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should login successfully with valid credentials", async () => {
      mockDatabase.getUserByUsername.mockReturnValue(mockUser);
      mockBcrypt.compareSync.mockReturnValue(true);
      mockJwt.sign.mockReturnValue("mock-token");

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        token: "mock-token",
        user: {
          id: 1,
          username: "testuser",
          email: "test@example.com",
          role: "admin",
          permissions: ["read", "write"],
          active: 1,
          created_at: "2024-01-01T00:00:00Z",
        },
      });
    });

    it("should fail with invalid username", async () => {
      mockDatabase.getUserByUsername.mockReturnValue(null);

      const response = await request(app)
        .post("/login")
        .send({ username: "invaliduser", password: "password123" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: "Invalid username or password",
      });
    });

    it("should fail with invalid password", async () => {
      mockDatabase.getUserByUsername.mockReturnValue(mockUser);
      mockBcrypt.compareSync.mockReturnValue(false);

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "wrongpassword" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: "Invalid username or password",
      });
    });

    it("should fail with inactive user", async () => {
      const deactivatedUser = { ...mockUser, active: 0 };
      mockDatabase.getUserByUsername.mockReturnValue(deactivatedUser);

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: "Invalid username or password",
      });
    });

    it("should fail with missing username", async () => {
      const response = await request(app)
        .post("/login")
        .send({ password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Username and password are required",
      });
    });

    it("should fail with missing password", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "testuser" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Username and password are required",
      });
    });

    it("should handle database errors", async () => {
      mockDatabase.getUserByUsername.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error",
      });
    });
  });

  describe("verify", () => {
    it("should verify valid token", async () => {
      const mockReq = {
        user: {
          userId: 1,
          username: "testuser",
          role: "admin",
          permissions: ["read", "write"],
        },
      } as any;

      const mockRes = {
        json: jest.fn(),
      } as any;

      await AuthController.verify(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 1,
            username: "testuser",
            role: "admin",
            permissions: ["read", "write"],
          },
        },
        message: "Token is valid",
      });
    });
  });

  describe("changePassword", () => {
    const mockCurrentUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      role: "admin" as const,
      permissions: ["read", "write"],
      active: true,
    };

    it("should change password successfully", async () => {
      const mockReq = {
        body: {
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        },
        user: { userId: 1 },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      mockDatabase.getUserById.mockReturnValue(mockCurrentUser);
      const updatedUser = { ...mockCurrentUser, username: "testuser" };
      mockDatabase.updateUser.mockReturnValue(updatedUser);

      await AuthController.changePassword(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Password changed successfully",
      });
    });

    it("should fail with missing current password", async () => {
      const mockReq = {
        body: {
          newPassword: "newpassword123",
        },
        user: { userId: 1 },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      await AuthController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Current password and new password are required",
      });
    });

    it("should fail with short new password", async () => {
      const mockReq = {
        body: {
          currentPassword: "oldpassword",
          newPassword: "short",
        },
        user: { userId: 1 },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      await AuthController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "New password must be at least 6 characters long",
      });
    });

    it("should handle special characters in new password", async () => {
      const mockReq = {
        body: {
          currentPassword: "oldpassword",
          newPassword: "new!@#$%^&*()password123",
        },
        user: { userId: 1 },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      mockDatabase.getUserById.mockReturnValue(mockCurrentUser);
      mockDatabase.updateUser.mockReturnValue({
        ...mockCurrentUser,
        // role should remain unchanged
      });

      await AuthController.changePassword(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Password changed successfully",
      });
    });

    it("should handle unicode characters in password", async () => {
      const specialData = {
        username: "测试用户",
        email: "test@测试.com",
      };

      const mockReq = {
        body: {
          currentPassword: "oldpassword",
          newPassword: "新密码123",
        },
        user: { userId: 1 },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      mockDatabase.getUserById.mockReturnValue(mockCurrentUser);
      mockDatabase.updateUser.mockReturnValue({
        ...mockCurrentUser,
        ...specialData,
      });

      await AuthController.changePassword(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Password changed successfully",
      });
    });
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      const newUserData = {
        username: "newuser",
        password: "password123",
        email: "new@example.com",
        role: "editor" as const,
        permissions: ["read", "write"],
      };

      const createdUser = {
        id: 2,
        ...newUserData,
        permissions: ["read", "write"],
        active: 1,
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockReq = {
        body: newUserData,
        user: { userId: 1, role: "admin" },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      // Mock AuthService.createUser to return the user without password
      jest.doMock("../../services/auth", () => ({
        AuthService: {
          createUser: jest.fn().mockResolvedValue(createdUser),
        },
      }));

      await AuthController.createUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: createdUser },
        message: "User created successfully",
      });
    });

    it("should fail with existing username", async () => {
      const newUserData = {
        username: "existinguser",
        password: "password123",
        email: "existing@example.com",
        role: "editor" as const,
      };

      const mockReq = {
        body: newUserData,
        user: { userId: 1, role: "admin" },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      // Mock AuthService.createUser to return null (username exists)
      jest.doMock("../../services/auth", () => ({
        AuthService: {
          createUser: jest.fn().mockResolvedValue(null),
        },
      }));

      await AuthController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Username already exists",
      });
    });

    it("should fail with missing required fields", async () => {
      const incompleteData = {
        username: "newuser",
        // Missing password
        email: "new@example.com",
      };

      const mockReq = {
        body: incompleteData,
        user: { userId: 1, role: "admin" },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      await AuthController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Username and password are required",
      });
    });

    it("should fail with short password", async () => {
      const userData = {
        username: "newuser",
        password: "short",
        role: "editor" as const,
      };

      const mockReq = {
        body: userData,
        user: { userId: 1, role: "admin" },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      await AuthController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    });
  });
});
