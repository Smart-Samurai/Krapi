#!/usr/bin/env node

/**
 * KRAPI Development Startup Script with Database
 *
 * This script:
 * 1. Stops any existing services
 * 2. Starts PostgreSQL container with consistent naming
 * 3. Waits for database to be ready
 * 4. Starts backend and frontend services
 * 5. Provides cleanup functionality
 */

const { spawn, exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

class DevStartup {
  constructor() {
    this.containerName = "krapi-dev-postgres";
    this.networkName = "krapi-dev-network";
    this.backendProcess = null;
    this.frontendProcess = null;
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
      INFO: "ℹ️",
      SUCCESS: "✅",
      WARNING: "⚠️",
      ERROR: "❌",
      CRITICAL: "💥",
    };
    console.log(`${levelEmoji[level]} [${timestamp}] ${message}`);
  }

  async cleanup() {
    this.log("🧹 Cleaning up existing services and containers...", "INFO");

    try {
      // Stop and remove existing container
      try {
        await execAsync(`docker stop ${this.containerName}`);
        await execAsync(`docker rm ${this.containerName}`);
        this.log(
          `✅ Removed existing container: ${this.containerName}`,
          "SUCCESS"
        );
      } catch (error) {
        // Container might not exist, that's okay
      }

      // Remove existing network
      try {
        await execAsync(`docker network rm ${this.networkName}`);
        this.log(`✅ Removed existing network: ${this.networkName}`, "SUCCESS");
      } catch (error) {
        // Network might not exist, that's okay
      }

      // Kill any existing Node.js processes on our ports
      try {
        await execAsync(
          "netstat -ano | findstr :3470 | for /f \"tokens=5\" %i in ('more') do taskkill /f /pid %i"
        );
        await execAsync(
          "netstat -ano | findstr :3498 | for /f \"tokens=5\" %i in ('more') do taskkill /f /pid %i"
        );
        this.log("✅ Killed processes on ports 3470 and 3498", "SUCCESS");
      } catch (error) {
        // No processes to kill, that's okay
      }
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, "WARNING");
    }
  }

  async startDatabase() {
    this.log("🐳 Starting PostgreSQL container...", "INFO");

    try {
      // Create network
      await execAsync(`docker network create ${this.networkName}`);
      this.log(`✅ Created network: ${this.networkName}`, "SUCCESS");

      // Start PostgreSQL container
      const dockerCommand = `docker run -d --name ${this.containerName} --network ${this.networkName} -p 5420:5432 -e POSTGRES_DB=krapi -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:15`;
      await execAsync(dockerCommand);
      this.log(
        `✅ Started PostgreSQL container: ${this.containerName}`,
        "SUCCESS"
      );

      // Wait for database to be ready
      this.log("⏳ Waiting for database to be ready...", "INFO");
      let dbReady = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!dbReady && attempts < maxAttempts) {
        try {
          const { stdout } = await execAsync(
            `docker exec ${this.containerName} pg_isready -U postgres`
          );
          if (stdout.includes("accepting connections")) {
            dbReady = true;
            this.log("✅ Database is ready", "SUCCESS");
          }
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(
              `Database not ready after ${maxAttempts} attempts: ${error.message}`
            );
          }
          this.log(
            `⏳ Database not ready yet (attempt ${attempts}/${maxAttempts}), waiting...`,
            "INFO"
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      this.log(`❌ Failed to start database: ${error.message}`, "ERROR");
      throw error;
    }
  }

  async startServices() {
    this.log("🚀 Starting backend and frontend services...", "INFO");

    try {
      // Start backend
      this.log("🔧 Starting backend service...", "INFO");
      this.backendProcess = spawn("cmd", ["/c", "npm", "run", "dev:backend"], {
        cwd: process.cwd(),
        stdio: ["inherit", "pipe", "pipe"],
        env: {
          ...process.env,
          DB_HOST: "localhost",
          DB_PORT: "5420",
          DB_NAME: "krapi",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          JWT_SECRET: "default-secret-change-this",
          JWT_EXPIRES_IN: "7d",
          SESSION_EXPIRES_IN: "1h",
          DEFAULT_ADMIN_PASSWORD: "admin123",
          PORT: "3470",
          HOST: "localhost",
          NODE_ENV: "development",
        },
      });

      // Start frontend
      this.log("🎨 Starting frontend service...", "INFO");
      this.frontendProcess = spawn(
        "cmd",
        ["/c", "npm", "run", "dev:frontend"],
        {
          cwd: process.cwd(),
          stdio: ["inherit", "pipe", "pipe"],
          env: {
            ...process.env,
            PORT: "3498",
          },
        }
      );

      // Wait for services to be ready
      this.log("⏳ Waiting for services to be ready...", "INFO");
      await this.waitForServicesReady();

      this.log("✅ All services started successfully", "SUCCESS");
      this.log("🔗 Backend: http://localhost:3470", "INFO");
      this.log("🔗 Frontend: http://localhost:3498", "INFO");
      this.log("🔗 Database: localhost:5420", "INFO");
    } catch (error) {
      this.log(`❌ Failed to start services: ${error.message}`, "ERROR");
      throw error;
    }
  }

  async waitForServicesReady() {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Check backend
        const backendResponse = await fetch("http://localhost:3470/health");
        if (backendResponse.ok) {
          this.log("✅ Backend is ready", "SUCCESS");
        } else {
          throw new Error("Backend not ready");
        }

        // Check frontend
        const frontendResponse = await fetch(
          "http://localhost:3498/api/health"
        );
        if (frontendResponse.ok) {
          this.log("✅ Frontend is ready", "SUCCESS");
          return; // Both services are ready
        } else {
          throw new Error("Frontend not ready");
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("Services failed to become ready within timeout");
        }
        this.log(
          `⏳ Services not ready yet (attempt ${attempts}/${maxAttempts}), waiting...`,
          "INFO"
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async stop() {
    this.log("🛑 Stopping services...", "INFO");

    if (this.backendProcess) {
      this.backendProcess.kill("SIGTERM");
    }
    if (this.frontendProcess) {
      this.frontendProcess.kill("SIGTERM");
    }

    // Wait for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Force kill if still running
    if (this.backendProcess) {
      this.backendProcess.kill("SIGKILL");
    }
    if (this.frontendProcess) {
      this.frontendProcess.kill("SIGKILL");
    }

    this.log("✅ Services stopped", "SUCCESS");
  }

  async run() {
    try {
      this.log("🚀 KRAPI Development Startup with Database", "INFO");
      this.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "INFO"
      );

      // Step 1: Cleanup
      await this.cleanup();

      // Step 2: Start Database
      await this.startDatabase();

      // Step 3: Start Services
      await this.startServices();

      this.log("🎉 Development environment ready!", "SUCCESS");
      this.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "INFO"
      );

      // Keep the process running
      process.on("SIGINT", async () => {
        this.log("\n🛑 Received SIGINT - cleaning up...", "INFO");
        await this.stop();
        await this.cleanup();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        this.log("\n🛑 Received SIGTERM - cleaning up...", "INFO");
        await this.stop();
        await this.cleanup();
        process.exit(0);
      });
    } catch (error) {
      this.log(`💥 Startup failed: ${error.message}`, "CRITICAL");
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  const startup = new DevStartup();
  startup.run();
}

module.exports = DevStartup;
