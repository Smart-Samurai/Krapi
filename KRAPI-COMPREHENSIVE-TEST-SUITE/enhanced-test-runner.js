/**
 * Enhanced KRAPI Test Runner with Database Container Reset
 *
 * This test runner ensures a completely fresh database for each test run
 * by destroying and recreating the PostgreSQL container with volumes.
 */

import chalk from "chalk";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import path from "path";
import CONFIG from "./config.js";

const execAsync = promisify(exec);

class EnhancedTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.containerName = "krapi-postgres";
    this.volumeName = "krapi_postgres_data";
    this.networkName = "krapi-network";
  }

  /**
   * Clean up old Docker networks to prevent subnet exhaustion
   */
  async cleanupOldNetworks() {
    console.log(chalk.yellow("🧹 Cleaning up old Docker networks..."));
    
    try {
      // Remove old test networks that might be causing subnet exhaustion
      const { stdout: networksOutput } = await execAsync(
        `docker network ls --filter "name=krapi_test_" --format "{{.ID}}"`
      );
      
      if (networksOutput.trim()) {
        const networkIds = networksOutput.trim().split('\n').filter(id => id);
        console.log(`  🔍 Found ${networkIds.length} old test networks to clean up`);
        
        for (const networkId of networkIds) {
          try {
            await execAsync(`docker network rm ${networkId}`);
            console.log(`  ✅ Removed network ${networkId}`);
          } catch (error) {
            // Network might be in use, skip it
            console.log(`  ⚠️  Could not remove network ${networkId} (in use)`);
          }
        }
      } else {
        console.log("  ✅ No old test networks found");
      }
      
      // Also run docker network prune to clean up any other unused networks
      await execAsync("docker network prune -f");
      console.log("  ✅ Docker network prune completed");
      
      return true;
    } catch (error) {
      console.error("  ⚠️  Warning: Could not clean up old networks:", error.message);
      return false;
    }
  }

  /**
   * Destroy the existing PostgreSQL container and volumes
   */
  async destroyDatabase() {
    console.log(
      chalk.red("🗑️  Destroying existing database container and volumes...")
    );

    try {
      // Use docker-compose to stop and remove everything
      // Get the current working directory and go up one level to the project root
      const projectRoot = process
        .cwd()
        .replace(/\\KRAPI-COMPREHENSIVE-TEST-SUITE$/, "");
      // Use full path to docker-compose to avoid path issues
      const downCommand = `docker-compose -f "${projectRoot}/docker-compose.yml" down -v`;
      await execAsync(downCommand);
      console.log(
        "  ✅ Docker-compose down completed (containers, volumes, networks removed)"
      );

      console.log("  ✅ Database destruction completed");
      return true;
    } catch (error) {
      console.error("  ❌ Error destroying database:", error.message);
      return false;
    }
  }

  /**
   * Create a fresh PostgreSQL container using docker-compose
   */
  async createDatabase() {
    console.log(chalk.green("🐘 Creating fresh PostgreSQL container..."));

    try {
      // Get the current working directory and go up one level to the project root
      const projectRoot = process
        .cwd()
        .replace(/\\KRAPI-COMPREHENSIVE-TEST-SUITE$/, "");

      // Use docker-compose to create and start the database
      const upCommand = `docker-compose -f "${projectRoot}/docker-compose.yml" up -d krapi-postgres`;
      await execAsync(upCommand);
      console.log("  ✅ Container created and started via docker-compose");

      // Wait for container to be ready
      console.log("  ⏳ Waiting for database to be ready...");
      let attempts = 0;
      const maxAttempts = 60; // Increase timeout to 2 minutes

      while (attempts < maxAttempts) {
        try {
          // First check if container is running
          const { stdout: statusOutput } = await execAsync(
            `docker inspect --format='{{.State.Status}}' krapi-postgres`
          );

          if (statusOutput.trim() === "running") {
            // Try to connect to the database to verify it's ready
            try {
              const { stdout: pgOutput } = await execAsync(
                `docker exec krapi-postgres pg_isready -U postgres -d krapi`
              );
              if (pgOutput.includes("accepting connections")) {
                console.log(
                  "  ✅ Database is running and accepting connections"
                );
                break;
              }
            } catch (pgError) {
              // Database not ready yet, continue waiting
            }
          }
        } catch (error) {
          // Container not ready yet, continue waiting
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (attempts % 5 === 0) {
          console.log(`  ⏳ Still waiting... (${attempts}/${maxAttempts})`);
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error("Database failed to become ready within timeout");
      }

      // Additional wait to ensure database is fully ready
      console.log("  ⏳ Additional wait for database stability...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return true;
    } catch (error) {
      console.error("  ❌ Error creating database:", error.message);
      return false;
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    console.log(chalk.blue("⏳ Waiting for services to be ready..."));

    // Wait for backend to be ready
    let backendReady = false;
    let attempts = 0;
    const maxAttempts = 15; // Reduced from 30 to 15 for faster failure detection

    while (!backendReady && attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `${CONFIG.DIRECT_BACKEND_URL}/krapi/k1/health`,
          {
            timeout: 5000,
          }
        );
        if (response.status === 200) {
          backendReady = true;
          console.log("  ✅ Backend is ready");
        }
      } catch (error) {
        // Continue waiting
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (attempts % 5 === 0) {
        console.log(`  ⏳ Waiting for backend... (${attempts}/${maxAttempts})`);
      }
    }

    if (!backendReady) {
      throw new Error("Backend failed to become ready within timeout");
    }

    // Wait for frontend to be ready
    let frontendReady = false;
    attempts = 0;

    while (!frontendReady && attempts < maxAttempts) {
      try {
        const response = await axios.get(`${CONFIG.FRONTEND_URL}`, {
          timeout: 5000,
        });
        if (response.status === 200) {
          frontendReady = true;
          console.log("  ✅ Frontend is ready");
        }
      } catch (error) {
        // Continue waiting
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (attempts % 5 === 0) {
        console.log(
          `  ⏳ Waiting for frontend... (${attempts}/${maxAttempts})`
        );
      }
    }

    if (!frontendReady) {
      throw new Error("Frontend failed to become ready within timeout");
    }

    // Wait for frontend API to be ready
    let frontendApiReady = false;
    attempts = 0;

    while (!frontendApiReady && attempts < maxAttempts) {
      try {
        const response = await axios.get(`${CONFIG.FRONTEND_API_URL}/health`, {
          timeout: 5000,
        });
        if (response.status === 200) {
          frontendApiReady = true;
          console.log("  ✅ Frontend API is ready");
        }
      } catch (error) {
        // Continue waiting
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (attempts % 5 === 0) {
        console.log(
          `  ⏳ Waiting for frontend API... (${attempts}/${maxAttempts})`
        );
      }
    }

    if (!frontendApiReady) {
      throw new Error("Frontend API failed to become ready within timeout");
    }

    console.log("  ✅ All services are ready");
  }

  /**
   * Wait for backend to auto-initialize database and verify admin user exists
   */
  async waitForAdminUser() {
    console.log(
      chalk.blue("🔧 Waiting for backend to auto-initialize database...")
    );

    try {
      // Wait a bit for backend to complete initialization
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Test database connection through frontend health endpoint
      const healthResponse = await axios.get(
        `${CONFIG.FRONTEND_API_URL}/health`
      );
      console.log("  ✅ Frontend health check passed:", healthResponse.data);

      // Test backend health directly
      const backendHealthResponse = await axios.get(
        `${CONFIG.DIRECT_BACKEND_URL}/krapi/k1/health`
      );
      console.log(
        "  ✅ Backend health check passed:",
        backendHealthResponse.data
      );

      // Wait for admin user to be available (backend auto-initialization)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds

      while (attempts < maxAttempts) {
        try {
          // Try to authenticate admin user
          const loginResponse = await axios.post(
            `${CONFIG.FRONTEND_API_URL}/auth/login`,
            {
              username: CONFIG.ADMIN_CREDENTIALS.username,
              password: CONFIG.ADMIN_CREDENTIALS.password,
            }
          );

          if (loginResponse.data.session_token) {
            console.log("  ✅ Admin user authentication successful");
            return loginResponse.data.session_token;
          }
        } catch (error) {
          // Continue waiting
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (attempts % 5 === 0) {
          console.log(
            `  ⏳ Waiting for admin user... (${attempts}/${maxAttempts})`
          );
        }
      }

      throw new Error(
        "Admin user not available after backend initialization timeout"
      );
    } catch (error) {
      console.error("  ❌ Failed to verify admin user:", error.message);
      throw error;
    }
  }

  /**
   * Run the complete test suite
   */
  async run() {
    console.log(chalk.blue.bold("🚀 Enhanced KRAPI Test Suite"));
    console.log(chalk.gray("━".repeat(80)));
    console.log(chalk.yellow("This test suite will:"));
    console.log(chalk.yellow("1. Wait for services to be ready"));
    console.log(chalk.yellow("2. Initialize database with admin user"));
    console.log(chalk.yellow("3. Run comprehensive functionality tests"));
    console.log(chalk.gray("━".repeat(80)));

    try {
      // Step 1: Wait for services to be ready
      await this.waitForServices();

      // Step 2: Wait for backend to auto-initialize database, then verify admin user exists
      console.log("⏳ Waiting for backend to auto-initialize database...");
      const adminToken = await this.waitForAdminUser();

      console.log(
        chalk.green.bold("\n✅ Database initialization completed successfully!")
      );
      console.log(chalk.green("🎯 Ready to run comprehensive tests"));

      // Now run the actual test suite
      console.log(chalk.blue.bold("\n🧪 Running comprehensive test suite..."));

      // Import and run the comprehensive test runner
      const { default: ComprehensiveTestRunner } = await import(
        "./full-system-test.js"
      );
      const runner = new ComprehensiveTestRunner();
      const testSuccess = await runner.run();

      return testSuccess;
    } catch (error) {
      console.error(chalk.red.bold("\n💥 Test setup failed:"), error.message);
      return false;
    }
  }
}

export default EnhancedTestRunner;
