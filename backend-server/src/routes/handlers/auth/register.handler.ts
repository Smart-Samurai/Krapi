import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for user registration
 * POST /krapi/k1/auth/register
 * 
 * SDK-FIRST: Uses backendSDK.auth.register() instead of custom implementation.
 */
export class RegisterHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      const registerData = req.body;

      // Validate required fields
      if (!registerData.username || !registerData.email || !registerData.password) {
        res.status(400).json({
          success: false,
          error: "Username, email, and password are required",
        });
        return;
      }

      // SDK-FIRST: Use backendSDK.auth.register()
      // Ensure role is set to an allowed value: 'master_admin', 'admin', or 'developer'
      // Default to 'developer' if no role is provided
      const allowedRoles = ['master_admin', 'admin', 'developer'];
      const role = registerData.role && allowedRoles.includes(registerData.role)
        ? registerData.role
        : 'developer';

      // Ensure access_level is set to an allowed value: 'full', 'read_write', or 'read_only'
      // Default to 'read_write' if no access_level is provided
      const allowedAccessLevels = ['full', 'read_write', 'read_only'];
      const access_level = registerData.access_level && allowedAccessLevels.includes(registerData.access_level)
        ? registerData.access_level
        : 'read_write';

      const result = await this.backendSDK.auth.register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        role,
        access_level,
        permissions: registerData.permissions,
      });

      // SDK returns: ApiResponse<{ success: boolean, user: AdminUser }>
      // Format: { success: true, data: { success: true, user: {...} } }
      let registrationData: { success: boolean; user: unknown };
      if (result && typeof result === 'object' && 'data' in result) {
        // ApiResponse format - extract inner data
        const innerData = (result as { data: unknown }).data;
        if (innerData && typeof innerData === 'object' && 'success' in innerData && 'user' in innerData) {
          registrationData = innerData as { success: boolean; user: unknown };
        } else {
          // Fallback: assume data is the user object
          registrationData = {
            success: true,
            user: innerData,
          };
        }
      } else if (result && typeof result === 'object' && 'user' in result) {
        // Direct format with user
        registrationData = result as { success: boolean; user: unknown };
      } else {
        // Fallback
        registrationData = {
          success: true,
          user: result,
        };
      }

      res.json({
        success: registrationData.success,
        data: registrationData.user,
        user: registrationData.user, // Also include 'user' for compatibility
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Registration failed",
      });
    }
  }
}


