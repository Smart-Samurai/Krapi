/**
 * Database Reset and Seeding Helper
 *
 * Provides utilities to reset and seed the database for testing
 */

import axios from "axios";
import CONFIG from "../config.js";

export class DatabaseHelper {
  /**
   * Reset and seed the database to a clean state
   * This will:
   * 1. Check current health status
   * 2. Run auto-repair to fix missing tables and admin user
   * 3. Verify the repair was successful
   */
  static async resetAndSeed() {
    console.log("🔄 Resetting and seeding database...");

    try {
      // First, check the current health status
      console.log("📊 Checking database health...");
      let healthResponse;
      try {
        healthResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/health`
        );
        console.log("✅ Health check completed:", {
          healthy: healthResponse.data.database?.isHealthy,
          message: healthResponse.data.message,
        });
      } catch (error) {
        console.log("⚠️  Health check failed, proceeding with repair...");
      }

      // Run the database repair/seeding process
      console.log("🔧 Running database auto-repair and seeding...");
      const repairResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/health/repair`
      );

      // Consider repair successful if message indicates completion OR success is true
      const repairSuccessful =
        repairResponse.data.success ||
        (repairResponse.data.message &&
          repairResponse.data.message.includes("completed"));

      if (!repairSuccessful) {
        throw new Error(
          `Database repair failed: ${repairResponse.data.message}`
        );
      }

      console.log(
        "✅ Database repair successful:",
        repairResponse.data.message
      );
      if (repairResponse.data.actions && repairResponse.data.actions.repairs) {
        repairResponse.data.actions.repairs.forEach((repair) => {
          console.log(`   ✓ ${repair}`);
        });
      }

      // Verify health after repair
      console.log("🔍 Verifying database health after repair...");
      const postRepairHealth = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/health`
      );

      if (postRepairHealth.data.database?.isHealthy) {
        console.log("✅ Database is now healthy and ready for testing");
        return {
          success: true,
          message: "Database reset and seeded successfully",
          details: repairResponse.data,
        };
      } else {
        console.log(
          "⚠️  Database health check still shows issues:",
          postRepairHealth.data
        );
        return {
          success: false,
          message:
            "Database repair completed but health check still shows issues",
          details: postRepairHealth.data,
        };
      }
    } catch (error) {
      console.error("❌ Database reset failed:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      return {
        success: false,
        message: `Database reset failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Verify that the admin user exists and can authenticate
   */
  static async verifyAdminUser() {
    try {
      console.log("🔐 Verifying admin user authentication...");

      const loginResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/auth/login`,
        {
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password,
        }
      );

      if (loginResponse.data.success && loginResponse.data.session_token) {
        console.log("✅ Admin user authentication successful");
        return {
          success: true,
          sessionToken: loginResponse.data.session_token,
          user: loginResponse.data.user,
        };
      } else {
        console.log("❌ Admin user authentication failed:", loginResponse.data);
        return {
          success: false,
          message: "Admin authentication failed",
          details: loginResponse.data,
        };
      }
    } catch (error) {
      console.error("❌ Admin user verification failed:", error.message);
      return {
        success: false,
        message: `Admin verification failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Clean up test data (projects, collections, documents, files)
   * This removes any test data created during testing while preserving the admin user
   */
  static async cleanupTestData(adminToken) {
    if (!adminToken) {
      console.log("⚠️  No admin token provided, skipping cleanup");
      return { success: false, message: "No admin token provided" };
    }

    try {
      console.log("🧹 Cleaning up test data...");
      const cleanupActions = [];

      // Get all projects and delete test projects
      try {
        const projectsResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );

        const testProjects = projectsResponse.data.filter(
          (project) =>
            project.name.includes("Test") ||
            project.name.includes("test") ||
            project.name.includes("CMS")
        );

        for (const project of testProjects) {
          try {
            await axios.delete(
              `${CONFIG.FRONTEND_URL}/api/projects/${project.id}`,
              {
                headers: { Authorization: `Bearer ${adminToken}` },
              }
            );
            cleanupActions.push(`Deleted test project: ${project.name}`);
          } catch (error) {
            console.log(
              `⚠️  Failed to delete project ${project.name}:`,
              error.message
            );
          }
        }
      } catch (error) {
        console.log("⚠️  Failed to get projects for cleanup:", error.message);
      }

      console.log("✅ Test data cleanup completed");
      cleanupActions.forEach((action) => console.log(`   ✓ ${action}`));

      return {
        success: true,
        message: "Test data cleanup completed",
        actions: cleanupActions,
      };
    } catch (error) {
      console.error("❌ Test data cleanup failed:", error.message);
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Complete database reset including cleanup of all test data
   */
  static async fullReset() {
    console.log("🔄 Starting full database reset...");

    // Step 1: Reset and seed database
    const resetResult = await this.resetAndSeed();
    if (!resetResult.success) {
      return resetResult;
    }

    // Step 2: Verify admin user
    const adminResult = await this.verifyAdminUser();
    if (!adminResult.success) {
      return adminResult;
    }

    // Step 3: Cleanup any existing test data
    const cleanupResult = await this.cleanupTestData(adminResult.sessionToken);

    console.log("✅ Full database reset completed successfully");

    return {
      success: true,
      message: "Full database reset completed",
      adminToken: adminResult.sessionToken,
      details: {
        reset: resetResult,
        admin: adminResult,
        cleanup: cleanupResult,
      },
    };
  }
}

export default DatabaseHelper;
