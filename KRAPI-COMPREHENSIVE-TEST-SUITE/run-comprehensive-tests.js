/**
 * Comprehensive KRAPI Test Runner Script
 *
 * This script:
 * 1. Starts the backend and frontend services in dev mode
 * 2. Waits for them to be ready
 * 3. Runs the enhanced test suite with fresh database
 * 4. Provides comprehensive testing of all KRAPI functionality
 */

import chalk from "chalk";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import axios from "axios";
import CONFIG from "./config.js";

const execAsync = promisify(exec);

class ComprehensiveTestRunner {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.testRunner = null;
    this.servicesStarted = false;
  }

  /**
   * Start backend service in dev mode
   */
  async startBackend() {
    console.log(chalk.blue("🚀 Starting backend service in dev mode..."));

    return new Promise((resolve, reject) => {
      this.backendProcess = spawn("npm", ["run", "dev:backend"], {
        cwd: "../",
        stdio: "pipe",
        shell: true,
      });

      let output = "";
      let isReady = false;

      this.backendProcess.stdout.on("data", (data) => {
        const message = data.toString();
        output += message;

        // Display real-time backend output
        console.log(chalk.cyan("  [BACKEND]"), message.trim());

        // Check if backend is ready
        if (
          message.includes("Server running on") ||
          message.includes("Listening on") ||
          message.includes("ready") ||
          message.includes("Server started") ||
          message.includes("Running on port")
        ) {
          if (!isReady) {
            isReady = true;
            console.log(chalk.green("  ✅ Backend service started"));
            resolve();
          }
        }

        // Log important messages
        if (message.includes("error") || message.includes("Error")) {
          console.log(chalk.red("  ⚠️  Backend:", message.trim()));
        }
      });

      this.backendProcess.stderr.on("data", (data) => {
        const message = data.toString();
        console.log(chalk.red("  [BACKEND ERROR]"), message.trim());

        if (message.includes("error") || message.includes("Error")) {
          console.log(chalk.red("  ❌ Backend error:", message.trim()));

          // AUTO-EXIT ON BACKEND CRASH
          if (
            message.includes("throw new Error") ||
            message.includes("TypeError") ||
            message.includes("ReferenceError") ||
            message.includes("Cannot find module") ||
            message.includes("app crashed") ||
            message.includes("SyntaxError") ||
            message.includes(
              "BackendSDK requires a valid database connection"
            ) ||
            message.includes("Error:") ||
            message.includes("duplicate key value violates") ||
            message.includes("unique constraint") ||
            message.includes("PostgreSQL") ||
            message.includes("pg_extension") ||
            message.includes("23505") ||
            message.includes("42P01")
          ) {
            console.log(
              chalk.red.bold("💥 BACKEND CRASHED - STOPPING TEST SUITE")
            );
            // Kill processes and exit
            if (this.backendProcess) this.backendProcess.kill();
            if (this.frontendProcess) this.frontendProcess.kill();
            process.exit(1);
          }
        }
      });

      this.backendProcess.on("error", (error) => {
        console.error(chalk.red("  💥 Backend process error:", error.message));
        reject(error);
      });

      this.backendProcess.on("exit", (code) => {
        if (code !== 0) {
          console.error(
            chalk.red(`  💥 Backend process exited with code ${code}`)
          );
          // AUTO-EXIT ON BACKEND PROCESS EXIT
          console.log(
            chalk.red.bold("💥 BACKEND PROCESS DIED - STOPPING TEST SUITE")
          );
          // Kill processes and exit
          if (this.backendProcess) this.backendProcess.kill();
          if (this.frontendProcess) this.frontendProcess.kill();
          process.exit(1);
        }
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!isReady) {
          console.log(
            chalk.yellow("  ⏳ Backend taking time to start, continuing...")
          );
          resolve();
        }
      }, 120000);
    });
  }

  /**
   * Start frontend service in dev mode
   */
  async startFrontend() {
    console.log(chalk.blue("🌐 Starting frontend service in dev mode..."));

    return new Promise((resolve, reject) => {
      this.frontendProcess = spawn("npm", ["run", "dev:frontend"], {
        cwd: "../",
        stdio: "pipe",
        shell: true,
      });

      let output = "";
      let isReady = false;

      this.frontendProcess.stdout.on("data", (data) => {
        const message = data.toString();
        output += message;

        // Display real-time frontend output
        console.log(chalk.magenta("  [FRONTEND]"), message.trim());

        // Check if frontend is ready
        if (
          message.includes("Ready") ||
          message.includes("Local:") ||
          message.includes("ready") ||
          message.includes("started server") ||
          message.includes("compiled successfully")
        ) {
          if (!isReady) {
            isReady = true;
            console.log(chalk.green("  ✅ Frontend service started"));
            resolve();
          }
        }

        // Log important messages
        if (message.includes("error") || message.includes("Error")) {
          console.log(chalk.red("  ⚠️  Frontend:", message.trim()));
        }
      });

      this.frontendProcess.stderr.on("data", (data) => {
        const message = data.toString();
        console.log(chalk.red("  [FRONTEND ERROR]"), message.trim());

        if (message.includes("error") || message.includes("Error")) {
          console.log(chalk.red("  ❌ Frontend error:", message.trim()));

          // AUTO-EXIT ON FRONTEND CRASH
          if (
            message.includes("throw new Error") ||
            message.includes("TypeError") ||
            message.includes("ReferenceError") ||
            message.includes("Cannot find module") ||
            message.includes("Failed to compile") ||
            message.includes("SyntaxError")
          ) {
            console.log(
              chalk.red.bold("💥 FRONTEND CRASHED - STOPPING TEST SUITE")
            );
            // Kill processes and exit
            if (this.backendProcess) this.backendProcess.kill();
            if (this.frontendProcess) this.frontendProcess.kill();
            process.exit(1);
          }
        }
      });

      this.frontendProcess.on("error", (error) => {
        console.error(chalk.red("  💥 Frontend process error:", error.message));
        reject(error);
      });

      this.frontendProcess.on("exit", (code) => {
        if (code !== 0) {
          console.error(
            chalk.red(`  💥 Frontend process exited with code ${code}`)
          );
          // AUTO-EXIT ON FRONTEND PROCESS EXIT
          console.log(
            chalk.red.bold("💥 FRONTEND PROCESS DIED - STOPPING TEST SUITE")
          );
          // Kill processes and exit
          if (this.backendProcess) this.backendProcess.kill();
          if (this.frontendProcess) this.frontendProcess.kill();
          process.exit(1);
        }
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!isReady) {
          console.log(
            chalk.yellow("  ⏳ Frontend taking time to start, continuing...")
          );
          resolve();
        }
      }, 120000);
    });
  }

  /**
   * Wait for services to be fully ready (optimized - single check per service)
   */
  async waitForServices() {
    console.log(chalk.blue("⏳ Waiting for services to be fully ready..."));

    // Wait for backend health (ultra-optimized)
    console.log("  🔍 Checking backend readiness...");
    let backendReady = false;
    let attempts = 0;
    const maxAttempts = 10; // Reduced from 15

    while (!backendReady && attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `${CONFIG.DIRECT_BACKEND_URL}/krapi/k1/health`,
          { timeout: 2000 } // Reduced timeout further
        );
        if (response.status === 200) {
          backendReady = true;
          console.log("  ✅ Backend health check passed");
        }
      } catch (error) {
        // Continue waiting
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced from 2 to 1 second

      if (attempts % 2 === 0) {
        console.log(`  ⏳ Waiting for backend... (${attempts}/${maxAttempts})`);
      }
    }

    if (!backendReady) {
      throw new Error("Backend failed to become ready within timeout");
    }

    // Wait for frontend to be ready (ultra-optimized)
    console.log("  🔍 Checking frontend readiness...");
    let frontendReady = false;
    attempts = 0;

    while (!frontendReady && attempts < maxAttempts) {
      try {
        const response = await axios.get(`${CONFIG.FRONTEND_URL}`, {
          timeout: 2000, // Reduced timeout further
        });
        if (response.status === 200) {
          frontendReady = true;
          console.log("  ✅ Frontend is ready");
        }
      } catch (error) {
        // Continue waiting
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced from 2 to 1 second

      if (attempts % 2 === 0) {
        console.log(
          `  ⏳ Waiting for frontend... (${attempts}/${maxAttempts})`
        );
      }
    }

    if (!frontendReady) {
      throw new Error("Frontend failed to become ready within timeout");
    }

    // Single frontend API check (no repeated polling)
    console.log("  🔍 Checking frontend API readiness...");
    try {
      const response = await axios.get(`${CONFIG.FRONTEND_API_URL}/health`, {
        timeout: 10000,
      });
      if (response.status === 200) {
        console.log("  ✅ Frontend API is ready");
      } else {
        throw new Error(`Frontend API returned status ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Frontend API not ready: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    console.log("  ✅ All services are ready");
  }

  /**
   * Check and kill processes using required ports
   */
  async killProcessesOnPorts() {
    console.log(
      chalk.yellow("🔍 Checking for processes using required ports...")
    );

    try {
      // Skip Node.js process check for now since it's causing issues
      console.log(
        chalk.yellow(
          "  ⚠️  Skipping Node.js process check (known issue), continuing..."
        )
      );

      // Check and kill processes on frontend port (3469)
      try {
        const frontendCheck = await Promise.race([
          execAsync(`netstat -ano | findstr :3469`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 10000)
          ),
        ]);

        if (frontendCheck.stdout.trim()) {
          // Filter out TIME_WAIT connections which are not active processes
          const lines = frontendCheck.stdout
            .split("\n")
            .filter(
              (line) =>
                line.trim() &&
                !line.includes("TIME_WAIT") &&
                !line.includes("CLOSE_WAIT")
            );

          if (lines.length > 0) {
            console.log(
              chalk.yellow(
                "  ⚠️  Found active processes using port 3469, killing them..."
              )
            );
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const pid = parts[4];
                try {
                  await Promise.race([
                    execAsync(`taskkill /F /PID ${pid}`),
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Timeout")), 10000)
                    ),
                  ]);
                  console.log(
                    chalk.green(`    ✅ Killed process ${pid} on port 3469`)
                  );
                } catch (killError) {
                  if (killError.message === "Timeout") {
                    console.log(
                      chalk.yellow(`    ⚠️  Killing process ${pid} timed out`)
                    );
                  } else {
                    console.log(
                      chalk.yellow(
                        `    ⚠️  Could not kill process ${pid}: ${killError.message}`
                      )
                    );
                  }
                }
              }
            }
          } else {
            console.log(
              chalk.green(
                "  ✅ Port 3469 has no active processes (only TIME_WAIT connections)"
              )
            );
          }
        } else {
          console.log(chalk.green("  ✅ Port 3469 is free"));
        }
      } catch (error) {
        if (error.message === "Timeout") {
          console.log(
            chalk.yellow("  ⚠️  Port 3469 check timed out, continuing...")
          );
        } else {
          // Port not in use or no processes found
          console.log(chalk.green("  ✅ Port 3469 is free"));
        }
      }

      // Check and kill processes on backend port (3470)
      try {
        const backendCheck = await Promise.race([
          execAsync(`netstat -ano | findstr :3470`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 10000)
          ),
        ]);

        if (backendCheck.stdout.trim()) {
          // Filter out TIME_WAIT connections which are not active processes
          const lines = backendCheck.stdout
            .split("\n")
            .filter(
              (line) =>
                line.trim() &&
                !line.includes("TIME_WAIT") &&
                !line.includes("CLOSE_WAIT")
            );

          if (lines.length > 0) {
            console.log(
              chalk.yellow(
                "  ⚠️  Found active processes using port 3470, killing them..."
              )
            );
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const pid = parts[4];
                try {
                  await Promise.race([
                    execAsync(`taskkill /F /PID ${pid}`),
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Timeout")), 10000)
                    ),
                  ]);
                  console.log(
                    chalk.green(`    ✅ Killed process ${pid} on port 3470`)
                  );
                } catch (killError) {
                  if (killError.message === "Timeout") {
                    console.log(
                      chalk.yellow(`    ⚠️  Killing process ${pid} timed out`)
                    );
                  } else {
                    console.log(
                      chalk.yellow(
                        `    ⚠️  Could not kill process ${pid}: ${killError.message}`
                      )
                    );
                  }
                }
              }
            }
          } else {
            console.log(
              chalk.green(
                "  ✅ Port 3470 has no active processes (only TIME_WAIT connections)"
              )
            );
          }
        } else {
          console.log(chalk.green("  ✅ Port 3470 is free"));
        }
      } catch (error) {
        if (error.message === "Timeout") {
          console.log(
            chalk.yellow("  ⚠️  Port 3470 check timed out, continuing...")
          );
        } else {
          // Port not in use or no processes found
          console.log(chalk.green("  ✅ Port 3470 is free"));
        }
      }

      // Wait a moment for processes to fully terminate
      console.log(
        chalk.blue("  ⏳ Waiting for processes to fully terminate...")
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log(chalk.green("  ✅ Port check complete"));
    } catch (error) {
      console.log(
        chalk.yellow(
          "  ⚠️  Port check failed, continuing anyway: " + error.message
        )
      );
    }
  }

  /**
   * Verify that ports are actually free after killing processes
   */
  async verifyPortsAreFree() {
    console.log(chalk.blue("🔍 Verifying ports are free..."));

    try {
      // Check frontend port
      try {
        const frontendCheck = await Promise.race([
          execAsync(`netstat -ano | findstr :3469`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 10000)
          ),
        ]);

        if (frontendCheck.stdout.trim()) {
          // Filter out TIME_WAIT connections which are not active processes
          const activeConnections = frontendCheck.stdout
            .split("\n")
            .filter(
              (line) =>
                line.trim() &&
                !line.includes("TIME_WAIT") &&
                !line.includes("CLOSE_WAIT")
            );

          if (activeConnections.length > 0) {
            throw new Error(
              "Port 3469 is still in use after killing processes"
            );
          }
          console.log(
            chalk.green(
              "  ✅ Port 3469 is confirmed free (only TIME_WAIT connections)"
            )
          );
        } else {
          console.log(chalk.green("  ✅ Port 3469 is confirmed free"));
        }
      } catch (error) {
        if (error.message.includes("Port 3469 is still in use")) {
          throw error;
        } else if (error.message === "Timeout") {
          console.log(
            chalk.yellow(
              "  ⚠️  Port 3469 verification timed out, assuming free"
            )
          );
        } else {
          // No processes found, port is free
          console.log(chalk.green("  ✅ Port 3469 is confirmed free"));
        }
      }

      // Check backend port
      try {
        const backendCheck = await Promise.race([
          execAsync(`netstat -ano | findstr :3470`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 10000)
          ),
        ]);

        if (backendCheck.stdout.trim()) {
          // Filter out TIME_WAIT connections which are not active processes
          const activeConnections = backendCheck.stdout
            .split("\n")
            .filter(
              (line) =>
                line.trim() &&
                !line.includes("TIME_WAIT") &&
                !line.includes("CLOSE_WAIT")
            );

          if (activeConnections.length > 0) {
            throw new Error(
              "Port 3470 is still in use after killing processes"
            );
          }
          console.log(
            chalk.green(
              "  ✅ Port 3470 is confirmed free (only TIME_WAIT connections)"
            )
          );
        } else {
          console.log(chalk.green("  ✅ Port 3470 is confirmed free"));
        }
      } catch (error) {
        if (error.message.includes("Port 3470 is still in use")) {
          throw error;
        } else if (error.message === "Timeout") {
          console.log(
            chalk.yellow(
              "  ⚠️  Port 3470 verification timed out, assuming free"
            )
          );
        } else {
          // No processes found, port is free
          console.log(chalk.green("  ✅ Port 3470 is confirmed free"));
        }
      }

      console.log(chalk.green("  ✅ All ports are confirmed free"));
    } catch (error) {
      console.error(
        chalk.red("  ❌ Port verification failed: " + error.message)
      );
      throw error;
    }
  }

  /**
   * Start all services
   */
  async startServices() {
    console.log(chalk.blue.bold("🚀 Starting KRAPI Services"));
    console.log(chalk.gray("━".repeat(50)));

    try {
      // First, kill any processes using our ports
      await this.killProcessesOnPorts();

      // Check if ports are actually free now
      await this.verifyPortsAreFree();

      // Start backend and frontend concurrently
      await Promise.all([this.startBackend(), this.startFrontend()]);

      // Wait for services to be ready
      await this.waitForServices();

      this.servicesStarted = true;
      console.log(chalk.green.bold("✅ All services started successfully"));
    } catch (error) {
      console.error(
        chalk.red.bold("💥 Failed to start services:"),
        error.message
      );
      throw error;
    }
  }

  /**
   * Clean up old Docker networks to prevent subnet exhaustion
   */
  async cleanupOldNetworks() {
    console.log(chalk.yellow("  🧹 Cleaning up old Docker networks..."));
    
    try {
      // Remove old test networks that might be causing subnet exhaustion
      const { stdout: networksOutput } = await execAsync(
        `docker network ls --filter "name=krapi_test_" --format "{{.ID}}"`
      );
      
      if (networksOutput.trim()) {
        const networkIds = networksOutput.trim().split('\n').filter(id => id);
        console.log(`    🔍 Found ${networkIds.length} old test networks to clean up`);
        
        for (const networkId of networkIds) {
          try {
            await execAsync(`docker network rm ${networkId}`);
            console.log(`    ✅ Removed network ${networkId}`);
          } catch (error) {
            // Network might be in use, skip it
            console.log(`    ⚠️  Could not remove network ${networkId} (in use)`);
          }
        }
      } else {
        console.log("    ✅ No old test networks found");
      }
      
      // Also run docker network prune to clean up any other unused networks
      await execAsync("docker network prune -f");
      console.log("    ✅ Docker network prune completed");
      
      return true;
    } catch (error) {
      console.error("    ⚠️  Warning: Could not clean up old networks:", error.message);
      return false;
    }
  }

  /**
   * Reset the database using docker-compose
   */
  async resetDatabase() {
    console.log(chalk.blue.bold("🗑️  Resetting Database"));
    console.log(chalk.gray("━".repeat(50)));

    try {
      // Get the project root directory
      const projectRoot = process
        .cwd()
        .replace(/\\KRAPI-COMPREHENSIVE-TEST-SUITE$/, "");

      // First, clean up old networks to prevent subnet exhaustion
      await this.cleanupOldNetworks();

      console.log(
        chalk.yellow("  🔍 Stopping and removing existing database...")
      );

      // Stop and remove existing containers and volumes
      const downCommand = `docker-compose -f "${projectRoot}/docker-compose.yml" down -v`;
      await execAsync(downCommand);
      console.log("  ✅ Existing database stopped and removed");

      // Force remove any remaining containers with the same name
      try {
        await execAsync(`docker rm -f krapi-postgres`);
        console.log("  ✅ Force removed any remaining container");
      } catch (error) {
        // Container might not exist, which is fine
        console.log("  ℹ️  No remaining container to force remove");
      }

      console.log(chalk.yellow("  🐘 Creating fresh database container..."));

      // Create and start fresh database with unique name
      const timestamp = Date.now();
      const uniqueDbName = `krapi_test_${timestamp}`;

      // Update docker-compose to use unique database name
      const upCommand = `docker-compose -f "${projectRoot}/docker-compose.yml" -p krapi_test_${timestamp} up -d krapi-postgres`;
      await execAsync(upCommand);
      console.log(
        "  ✅ Fresh database container created with unique name:",
        uniqueDbName
      );

      // Set environment variable for the unique database name
      process.env.DB_NAME = uniqueDbName;

      // Wait for database to be ready (ultra-optimized - much faster)
      console.log(chalk.yellow("  ⏳ Waiting for database to be ready..."));
      let attempts = 0;
      const maxAttempts = 5; // Reduced from 10 to 5 attempts

      while (attempts < maxAttempts) {
        try {
          // Check if container is running
          const { stdout: statusOutput } = await execAsync(
            `docker inspect --format='{{.State.Status}}' krapi-postgres`
          );

          if (statusOutput.trim() === "running") {
            // Try to connect to the database to verify it's ready
            try {
              const { stdout: pgOutput } = await execAsync(
                `docker exec krapi-postgres pg_isready -U postgres -d krapi -t 1`
              );
              if (pgOutput.includes("accepting connections")) {
                console.log(
                  "  ✅ Database is running and accepting connections"
                );
                break;
              }
            } catch (pgError) {
              // Database not ready yet, continue waiting
              console.log(
                `  ⏳ Database not ready yet (attempt ${attempts + 1}): ${
                  pgError.message
                }`
              );
            }
          } else {
            console.log(`  ⏳ Container status: ${statusOutput.trim()}`);
          }
        } catch (error) {
          // Container not ready yet, continue waiting
          console.log(
            `  ⏳ Container not ready yet (attempt ${attempts + 1}): ${
              error.message
            }`
          );
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced from 2 to 1 second

        if (attempts % 2 === 0) {
          console.log(`  ⏳ Still waiting... (${attempts}/${maxAttempts})`);
        }
      }

      if (attempts >= maxAttempts) {
        console.log(
          chalk.yellow(
            "  ⚠️  Database readiness check timed out, but continuing..."
          )
        );
        console.log(
          chalk.yellow(
            "  ℹ️  Container is running, will let services handle connection"
          )
        );
      } else {
        console.log(chalk.green("  ✅ Database readiness confirmed"));
      }

      // Minimal additional wait for database stability
      console.log("  ⏳ Additional wait for database stability...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced from 2 to 1 second

      // Test actual database connection using the same parameters the backend will use
      console.log(chalk.yellow("  🔍 Testing actual database connection..."));
      try {
        const { stdout: connectionTest } = await execAsync(
          `docker exec krapi-postgres psql -U postgres -d krapi -c "SELECT 1 as test;" -t`
        );
        if (connectionTest.includes("1")) {
          console.log("  ✅ Database connection test successful");
        } else {
          console.log(
            "  ⚠️  Database connection test returned unexpected result"
          );
        }
      } catch (error) {
        console.log(
          chalk.yellow(
            "  ⚠️  Database connection test failed, but continuing: " +
              error.message
          )
        );
      }

      console.log(chalk.green("  ✅ Database reset completed successfully"));
    } catch (error) {
      console.error(chalk.red("  ❌ Database reset failed:"), error.message);
      throw error;
    }
  }

  /**
   * Stop all services
   */
  async stopServices() {
    console.log(chalk.blue("🛑 Stopping services..."));

    if (this.backendProcess) {
      this.backendProcess.kill("SIGTERM");
      console.log("  ✅ Backend stopped");
    }

    if (this.frontendProcess) {
      this.frontendProcess.kill("SIGTERM");
      console.log("  ✅ Frontend stopped");
    }
  }

  /**
   * Run the enhanced test suite
   */
  async runTests() {
    console.log(chalk.blue.bold("\n🧪 Running Enhanced Test Suite"));
    console.log(chalk.gray("━".repeat(50)));

    try {
      // Import and run the enhanced test runner
      const { default: EnhancedTestRunner } = await import(
        "./enhanced-test-runner.js"
      );
      this.testRunner = new EnhancedTestRunner();

      const success = await this.testRunner.run();
      return success;
    } catch (error) {
      console.error(chalk.red.bold("💥 Test execution failed:"), error.message);
      return false;
    }
  }

  /**
   * Main execution method
   */
  async run() {
    const startTime = Date.now();

    try {
      console.log(chalk.blue.bold("🚀 KRAPI Comprehensive Test Suite"));
      console.log(chalk.gray("━".repeat(80)));
      console.log(chalk.yellow("This test suite will:"));
      console.log(
        chalk.yellow("1. Reset database with fresh container and volumes")
      );
      console.log(
        chalk.yellow("2. Start backend and frontend services in dev mode")
      );
      console.log(chalk.yellow("3. Wait for services to be fully ready"));
      console.log(chalk.yellow("4. Run comprehensive functionality tests"));
      console.log(
        chalk.yellow(
          "5. Test all CRUD operations, file storage, and API routes"
        )
      );
      console.log(chalk.gray("━".repeat(80)));

      // First, reset the database
      await this.resetDatabase();

      // Start services
      await this.startServices();

      // Run tests
      const testSuccess = await this.runTests();

      // Print final summary
      const totalDuration = Date.now() - startTime;
      const durationSeconds = (totalDuration / 1000).toFixed(1);

      console.log(chalk.blue.bold("\n📊 Test Suite Summary"));
      console.log(chalk.gray("━".repeat(80)));
      console.log(`Total Duration: ${durationSeconds}s`);

      if (testSuccess) {
        console.log(chalk.green.bold("🎉 All tests passed!"));
        console.log(chalk.green("🚀 KRAPI system is working correctly!"));
      } else {
        console.log(chalk.red.bold("💥 Some tests failed!"));
        console.log(
          chalk.yellow("Please check the detailed error messages above.")
        );
      }

      return testSuccess;
    } catch (error) {
      console.error(
        chalk.red.bold("\n💥 Test suite execution failed:"),
        error.message
      );
      return false;
    } finally {
      // Always stop services
      await this.stopServices();
    }
  }
}

// Main execution
async function main() {
  const runner = new ComprehensiveTestRunner();

  try {
    const success = await runner.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red("Unexpected error:"), error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log(
    chalk.yellow("\n🛑 Received SIGINT, shutting down gracefully...")
  );
  if (global.testRunner) {
    await global.testRunner.stopServices();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log(
    chalk.yellow("\n🛑 Received SIGTERM, shutting down gracefully...")
  );
  if (global.testRunner) {
    await global.testRunner.stopServices();
  }
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error);
  process.exit(1);
});
