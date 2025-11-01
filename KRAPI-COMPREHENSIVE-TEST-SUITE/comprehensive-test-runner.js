#!/usr/bin/env node

import { spawn, exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import axios from "axios";
import fs from "fs";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ComprehensiveTestRunner {
  constructor() {
    this.projectRoot = join(__dirname, "..");
    this.testSuiteRoot = __dirname;
    this.results = {
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
    };
    this.sessionToken = null;
    this.testProject = null;
    this.testCollection = null;
    this.errors = [];
    this.testDetails = [];
    this.individualTestResults = [];
    this.failedAtSuite = null;
    this.totalSuites = 0;
    this.services = {
      backend: null,
      frontend: null,
    };
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

  async runCommand(command, options = {}) {
    this.log(`Running: ${command}`, "INFO");
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        ...options,
      });
      if (stderr && !options.ignoreStderr) {
        this.log(`Command stderr: ${stderr}`, "WARNING");
      }
      return { stdout, stderr, success: true };
    } catch (error) {
      this.log(`Command failed: ${error.message}`, "ERROR");
      return { stdout: error.stdout, stderr: error.stderr, success: false };
    }
  }

  async killProcessOnPort(port) {
    try {
      // Windows command to kill process on port
      const result = await this.runCommand(`netstat -ano | findstr :${port}`);
      if (result.success && result.stdout) {
        const lines = result.stdout.split("\n");
        for (const line of lines) {
          if (line.includes(`:${port}`)) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== "0") {
              this.log(`Killing process ${pid} on port ${port}`, "INFO");
              await this.runCommand(`taskkill /PID ${pid} /F`, {
                ignoreStderr: true,
              });
            }
          }
        }
      }
    } catch (error) {
      this.log(
        `Failed to kill process on port ${port}: ${error.message}`,
        "WARNING"
      );
    }
  }

  async cleanupExistingResources() {
    this.log("🧹 Cleaning up existing test resources...", "INFO");

    // Kill processes on test ports
    await this.killProcessOnPort(3498); // Frontend
    await this.killProcessOnPort(3470); // Backend
    await this.killProcessOnPort(5420); // Database

    // Use docker compose to safely manage containers with full cleanup
    // On Windows, Docker commands may fail due to named pipe issues, so make this graceful
    try {
      const result = await this.runCommand("docker compose down -v --remove-orphans", {
        ignoreStderr: true,
      });
      if (result.success) {
        this.log(
          "✅ Stopped existing Docker services and removed volumes",
          "SUCCESS"
        );
      } else {
        this.log("ℹ️ Docker cleanup skipped (likely Windows Docker issue)", "INFO");
      }
    } catch (error) {
      this.log("ℹ️ Docker cleanup skipped (likely Windows Docker issue)", "INFO");
    }

    // Clean up any orphaned networks
    try {
      await this.runCommand("docker network prune -f", {
        ignoreStderr: true,
      });
      this.log("✅ Cleaned up orphaned Docker networks", "SUCCESS");
    } catch (error) {
      this.log("ℹ️ No orphaned networks to clean", "INFO");
    }

    this.log("✅ Cleanup complete", "SUCCESS");
  }

  async setupDockerEnvironment() {
    this.log("🐳 Setting up Docker test environment...", "INFO");

    // On Windows, Docker Desktop may not be accessible from child processes
    // Try Docker commands but gracefully handle failures if container is already running
    const checkResult = await this.runCommand(
      "docker ps --filter name=krapi-postgres --format {{.Names}}",
      { ignoreStderr: true }
    );

    if (checkResult.success && checkResult.stdout && checkResult.stdout.includes("krapi-postgres")) {
      this.log("✅ PostgreSQL container already running", "SUCCESS");
    } else {
      // Try to start via docker compose
      const composeResult = await this.runCommand("docker compose up -d", {
        ignoreStderr: true,
      });
      
      if (composeResult.success) {
        this.log("✅ Started PostgreSQL container via docker compose", "SUCCESS");
      } else {
        // Docker commands failed - likely Windows named pipe issue
        // Assume container is already running (as user confirmed) and continue
        this.log("⚠️ Docker commands failed (likely Windows named pipe issue)", "WARNING");
        this.log("ℹ️ Assuming PostgreSQL container is already running as confirmed", "INFO");
      }
    }

    // Wait for database to be ready
    this.log("⏳ Waiting for database to be ready...", "INFO");
    let dbReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!dbReady && attempts < maxAttempts) {
      try {
        const result = await this.runCommand(
          `docker exec krapi-postgres pg_isready -U postgres -d krapi`,
          { ignoreStderr: true }
        );
        if (result.success) {
          dbReady = true;
          this.log("✅ Database is ready", "SUCCESS");
        } else {
          // If Docker exec fails, try connecting directly via psql to verify DB is accessible
          // On Windows, docker exec may fail due to named pipe issues, but DB might still be accessible
          if (attempts >= 5) {
            this.log(
              "⚠️ Docker exec failed, but assuming database is accessible (Windows Docker issue)",
              "WARNING"
            );
            dbReady = true;
            break;
          }
        }
      } catch (error) {
        // Ignore errors and continue
      }
      attempts++;
      if (attempts >= maxAttempts) {
        // Don't throw - assume DB is ready if Docker commands fail
        this.log(
          "⚠️ Could not verify database via Docker commands, assuming it's ready",
          "WARNING"
        );
        dbReady = true;
        break;
      }
      this.log(
        `⏳ Database not ready yet (attempt ${attempts}/${maxAttempts}), waiting...`,
        "INFO"
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.log("✅ Docker environment setup complete", "SUCCESS");
  }

  async buildServices() {
    this.log("🔨 Building all services...", "INFO");

    // Build packages first
    this.log("   Building packages...", "INFO");
    const packagesResult = await this.runCommand("npm run build:packages");
    if (!packagesResult.success) {
      throw new Error(`Failed to build packages: ${packagesResult.stderr}`);
    }
    this.log("✅ Packages built successfully", "SUCCESS");

    // Build backend
    this.log("   Building backend...", "INFO");
    const backendResult = await this.runCommand("npm run build:backend");
    if (!backendResult.success) {
      throw new Error(`Failed to build backend: ${backendResult.stderr}`);
    }
    this.log("✅ Backend built successfully", "SUCCESS");

    // Build frontend
    this.log("   Building frontend...", "INFO");
    const frontendResult = await this.runCommand("npm run build:frontend");
    if (!frontendResult.success) {
      throw new Error(`Failed to build frontend: ${frontendResult.stderr}`);
    }
    this.log("✅ Frontend built successfully", "SUCCESS");

    this.log("✅ All services built successfully", "SUCCESS");
  }

  async startServices() {
    this.log("🚀 Starting services...", "INFO");

    // Start backend
    this.log("   Starting backend...", "INFO");
    const backendProcess = spawn("npm", ["run", "dev:backend"], {
      cwd: this.projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    this.services.backend = backendProcess;

    // Log backend output for debugging
    backendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`   Backend: ${output}`, "INFO");
      }
    });

    backendProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`   Backend Error: ${output}`, "ERROR");
      }
    });

    // Start frontend
    this.log("   Starting frontend...", "INFO");
    const frontendProcess = spawn("npm", ["run", "dev:frontend"], {
      cwd: this.projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    this.services.frontend = frontendProcess;

    // Log frontend output for debugging
    frontendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`   Frontend: ${output}`, "INFO");
      }
    });

    frontendProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`   Frontend Error: ${output}`, "ERROR");
      }
    });

    // Wait for services to be ready
    this.log("⏳ Waiting for services to be ready...", "INFO");
    let servicesReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes

    while (!servicesReady && attempts < maxAttempts) {
      try {
        // Check backend health endpoint (no auth required)
        const backendResponse = await axios.get(
          "http://localhost:3470/health",
          {
            timeout: 5000,
          }
        );

        // Check frontend by trying to access a public endpoint
        const frontendResponse = await axios.get(
          "http://localhost:3498/api/health",
          {
            timeout: 5000,
          }
        );

        if (backendResponse.status === 200 && frontendResponse.status === 200) {
          servicesReady = true;
          this.log("✅ All services are ready", "SUCCESS");
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // Log detailed failure information
          this.log(
            `❌ Services failed to start after ${maxAttempts} attempts`,
            "ERROR"
          );
          this.log(`   Last error: ${error.message}`, "ERROR");

          // Check backend specifically
          try {
            const backendCheck = await axios.get(
              "http://localhost:3470/health",
              { timeout: 2000 }
            );
            this.log(
              `   Backend status: ${backendCheck.status} (healthy)`,
              "INFO"
            );
          } catch (backendError) {
            this.log(`   Backend error: ${backendError.message}`, "ERROR");
            if (backendError.response) {
              this.log(
                `   Backend response status: ${backendError.response.status}`,
                "ERROR"
              );
            }
          }

          // Check frontend specifically
          try {
            const frontendCheck = await axios.get(
              "http://localhost:3498/api/health",
              { timeout: 2000 }
            );
            this.log(
              `   Frontend status: ${frontendCheck.status} (healthy)`,
              "INFO"
            );
          } catch (frontendError) {
            this.log(`   Frontend error: ${frontendError.message}`, "ERROR");
            if (frontendError.response) {
              this.log(
                `   Frontend response status: ${frontendError.response.status}`,
                "ERROR"
              );
            }
          }

          // Check if processes are still running
          this.log(
            `   Backend process running: ${
              this.services.backend ? !this.services.backend.killed : false
            }`,
            "INFO"
          );
          this.log(
            `   Frontend process running: ${
              this.services.frontend ? !this.services.frontend.killed : false
            }`,
            "INFO"
          );

          throw new Error(
            `Services not ready after ${maxAttempts} attempts. Check logs above for details.`
          );
        }
        this.log(
          `⏳ Services not ready yet (attempt ${attempts}/${maxAttempts}), waiting...`,
          "INFO"
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.log("✅ All services started successfully", "SUCCESS");
  }

  async setupTestEnvironment() {
    this.log("🔧 Setting up test environment...", "INFO");

    try {
      // Login to get session token
      this.log("   Logging in...", "INFO");
      const loginResponse = await axios.post(
        "http://localhost:3498/api/auth/login",
        {
          username: "admin",
          password: "admin123",
        },
        {
          timeout: 10000,
        }
      );

      if (!loginResponse.data.session_token) {
        throw new Error("No session token received from login");
      }

      this.sessionToken = loginResponse.data.session_token;
      this.log("✅ Authentication successful", "SUCCESS");

      // Test project will be created during the first test
      this.testProject = null;
      this.log(
        "✅ Test environment ready - project will be created during tests",
        "SUCCESS"
      );
    } catch (error) {
      this.log(
        `❌ Failed to setup test environment: ${error.message}`,
        "ERROR"
      );
      return false;
    }
    return true;
  }

  async runTest(testFile) {
    return new Promise(async (resolve, reject) => {
      try {
        this.log(`🧪 Running ${testFile}...`, "INFO");

        // Import and run the test class
        const testModule = await import(join(this.testSuiteRoot, testFile));
        const TestClass = testModule.default;

        if (!TestClass) {
          throw new Error(`No default export found in ${testFile}`);
        }

        // Create test instance and run
        const testInstance = new TestClass(this.sessionToken, this.testProject);
        await testInstance.runAll();

        this.log(`✅ ${testFile} PASSED`, "SUCCESS");
        this.results.passed++;
        resolve(true);
      } catch (error) {
        this.log(`❌ ${testFile} FAILED: ${error.message}`, "ERROR");
        this.results.failed++;
        reject(error);
      }
    });
  }

  async runAllTests() {
    this.log("🚀 Starting Comprehensive Test Suite", "INFO");
    const startTime = Date.now();

    try {
      // Clean up existing resources
      await this.cleanupExistingResources();

      // Setup Docker environment
      await this.setupDockerEnvironment();

      // Build all services
      await this.buildServices();

      // Start services
      await this.startServices();

      // Setup test environment
      const setupSuccess = await this.setupTestEnvironment();
      if (!setupSuccess) {
        this.log("❌ Test environment setup failed", "ERROR");
        return false;
      }

      // Load and run all comprehensive test files
      this.log("🧪 Running comprehensive test suite...", "INFO");

      const testFiles = ["comprehensive-unified-test.js"];

      this.log(`📋 Running ${testFiles.length} test suites`, "INFO");
      this.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "INFO"
      );

      this.totalSuites = testFiles.length;

      for (const testFile of testFiles) {
        try {
          this.log(`🔍 Running ${testFile}...`, "INFO");

          // Import and run the test file
          const testModule = await import(`./${testFile}`);
          const TestClass = testModule.default;

          // Create test instance
          const testInstance = new TestClass(
            this.sessionToken,
            this.testProject
          );

          // Run the test suite
          this.log(`🔍 Running test suite: ${testFile}`, "INFO");
          const result = await testInstance.runAll();

          // Collect individual test results from the test framework
          if (testInstance.results && Array.isArray(testInstance.results)) {
            testInstance.results.forEach((testResult) => {
              this.individualTestResults.push({
                suite: testFile,
                test: testResult.test,
                status: testResult.status,
                duration: testResult.duration,
                error: testResult.error,
              });
            });
          }

          // Update shared test project if available
          if (result === true && testInstance.testProject) {
            this.testProject = testInstance.testProject;
          }

          if (result === true) {
            this.results.passed++;
            this.log(`✅ ${testFile} PASSED`, "SUCCESS");
            this.testDetails.push({
              test: testFile,
              status: "PASSED",
              error: null,
            });
          } else {
            this.results.failed++;
            this.log(`❌ ${testFile} FAILED`, "ERROR");
            this.testDetails.push({
              test: testFile,
              status: "FAILED",
              error: "Test returned false",
            });

            // STOP IMMEDIATELY on any test failure
            this.log(
              "🚨 TEST FAILURE DETECTED - STOPPING TEST SUITE IMMEDIATELY",
              "CRITICAL"
            );
            throw new Error(`Test ${testFile} failed - stopping immediately`);
          }
          this.results.total++;
        } catch (error) {
          this.results.failed++;
          this.results.total++;
          this.failedAtSuite = testFile;
          const errorMessage = `❌ Failed to run ${testFile}: ${error.message}`;
          this.log(errorMessage, "ERROR");
          this.errors.push(errorMessage);
          this.testDetails.push({
            test: testFile,
            status: "ERROR",
            error: error.message,
          });

          // STOP IMMEDIATELY on any error
          this.log(
            "🚨 ERROR DETECTED - STOPPING TEST SUITE IMMEDIATELY",
            "CRITICAL"
          );
          throw error;
        }
      }

      // If we get here, all tests passed
      const duration = Date.now() - startTime;
      this.displayResults(duration);
      return true;
    } catch (error) {
      this.log(`💥 FATAL ERROR: ${error.message}`, "CRITICAL");
      // Mark as failed when fatal error occurs
      this.results.failed = 1;
      this.results.total = 1;
      const duration = Date.now() - startTime;
      this.displayResults(duration);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    this.log("🧹 Cleaning up test environment...", "INFO");

    // Stop services
    if (this.services.backend) {
      this.log("   Stopping backend service...", "INFO");
      this.services.backend.kill("SIGTERM");
      // Wait a moment for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Force kill if still running
      if (!this.services.backend.killed) {
        this.services.backend.kill("SIGKILL");
      }
      this.log("✅ Backend service stopped", "SUCCESS");
    }

    if (this.services.frontend) {
      this.log("   Stopping frontend service...", "INFO");
      this.services.frontend.kill("SIGTERM");
      // Wait a moment for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Force kill if still running
      if (!this.services.frontend.killed) {
        this.services.frontend.kill("SIGKILL");
      }
      this.log("✅ Frontend service stopped", "SUCCESS");
    }

    // Wait a moment for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Kill any remaining processes on ports
    await this.killProcessOnPort(3498);
    await this.killProcessOnPort(3470);
    await this.killProcessOnPort(5420);

    // Use docker compose to safely stop services with full cleanup
    try {
      this.log("   Stopping Docker services...", "INFO");
      const result = await this.runCommand(
        "docker compose down -v --remove-orphans",
        {
          ignoreStderr: true,
        }
      );
      if (result.success) {
        this.log(
          "✅ Docker services stopped and volumes removed via docker-compose",
          "SUCCESS"
        );
      } else {
        this.log(`⚠️ Docker cleanup had issues: ${result.stderr}`, "WARNING");
      }
    } catch (error) {
      this.log(
        `⚠️ Failed to stop Docker services: ${error.message}`,
        "WARNING"
      );
    }

    // Clean up any orphaned networks
    try {
      await this.runCommand("docker network prune -f", {
        ignoreStderr: true,
      });
      this.log("✅ Cleaned up orphaned Docker networks", "SUCCESS");
    } catch (error) {
      this.log("⚠️ Failed to clean up networks", "WARNING");
    }

    // Verify Docker cleanup worked
    try {
      const checkResult = await this.runCommand(
        "docker ps -a --filter name=krapi-postgres",
        {
          ignoreStderr: true,
        }
      );
      if (
        checkResult.success &&
        checkResult.stdout.includes("krapi-postgres")
      ) {
        this.log("⚠️ Docker container still exists after cleanup", "WARNING");
      } else {
        this.log("✅ Docker container properly removed", "SUCCESS");
      }
    } catch (error) {
      this.log("ℹ️ Could not verify Docker cleanup status", "INFO");
    }

    this.log("✅ Cleanup complete", "SUCCESS");
  }

  displayResults(duration) {
    this.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "INFO"
    );
    this.log("📊 TEST RESULTS SUMMARY", "INFO");
    this.log(`   Test Suites: ${this.results.total}`, "INFO");
    this.log(
      `   Individual Tests: ${this.individualTestResults.length}`,
      "INFO"
    );
    this.log(`   Passed: ${this.results.passed}`, "INFO");
    this.log(`   Failed: ${this.results.failed}`, "INFO");

    if (this.failedAtSuite) {
      const remainingSuites = this.totalSuites - this.results.total;
      this.log(`   Remaining Suites: ${remainingSuites}`, "INFO");
    }

    this.log(`   Duration: ${duration}ms`, "INFO");

    if (this.results.failed === 0) {
      this.log("🎉 ALL TESTS PASSED SUCCESSFULLY!", "SUCCESS");
    } else {
      this.log("❌ SOME TESTS FAILED - SEE ERRORS ABOVE", "ERROR");

      // Display collected errors at the end
      if (this.errors.length > 0) {
        this.log("", "INFO");
        this.log("🔍 ERROR SUMMARY:", "ERROR");
        this.errors.forEach((error, index) => {
          this.log(`   ${index + 1}. ${error}`, "ERROR");
        });
      }
    }

    // Add a pause to ensure results are fully displayed before process exit
    this.log("⏳ Finalizing results display...", "INFO");
    setTimeout(() => {
      this.log("✅ Results display completed", "SUCCESS");
    }, 2000);
  }
}

// Add global error handlers to catch any unhandled errors
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
  process.exit(1);
});

// Run the test suite
const runner = new ComprehensiveTestRunner();
runner
  .runAllTests()
  .then((success) => {
    // Add a grace period to ensure all output is displayed before exit
    setTimeout(() => {
      process.exit(success ? 0 : 1);
    }, 3000); // 3 second grace period for output display
  })
  .catch((error) => {
    console.error("💥 FATAL ERROR:", error);
    // Add a grace period to ensure error output is displayed before exit
    setTimeout(() => {
      process.exit(1);
    }, 3000); // 3 second grace period for error display
  });
