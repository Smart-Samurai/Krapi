#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Load environment variables from root
require("dotenv").config({ path: path.join(__dirname, "../.env") });

class KrapiSupervisor {
  constructor() {
    this.processes = {};
    this.isRunning = false;
    this.dbContainerName = process.env.DB_CONTAINER_NAME || "krapi-postgres";
    this.dbPort = process.env.DB_PORT || 5432;
    this.dbUser = process.env.DB_USER || "postgres";
    this.dbPassword = process.env.DB_PASSWORD || "postgres";
    this.dbName = process.env.DB_NAME || "krapi";
    this.npmPath = "npm";

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkDependencies() {
    this.log("Checking dependencies...");

    // Check if Docker is available
    try {
      await this.execCommand("docker --version");
      this.log("Docker is available", "success");
    } catch (error) {
      this.log(
        "Docker is not available. Please install Docker to use PostgreSQL container management.",
        "error"
      );
      return false;
    }

    // Check if pnpm is available
    try {
      await this.execCommand("pnpm --version");
      this.log("pnpm is available", "success");
    } catch (error) {
      this.log("pnpm is not available. Please install pnpm.", "error");
      return false;
    }

    // Check if npm is available
    try {
      await this.execCommand("npm --version");
      this.log("npm is available", "success");
    } catch (error) {
      this.log("npm is not available. Please install npm.", "error");
      return false;
    }

    // Check if ports are available
    await this.checkPortAvailability();

    return true;
  }

  async checkPortAvailability() {
    this.log("Checking port availability...");

    const backendPort = process.env.BACKEND_PORT || 3470;
    const frontendPort = process.env.FRONTEND_PORT || 3469;

    try {
      // Check and kill processes on backend port
      await this.killProcessesOnPort(backendPort, "backend");

      // Check and kill processes on frontend port
      await this.killProcessesOnPort(frontendPort, "frontend");
    } catch (error) {
      this.log("Could not check port availability", "warn");
    }
  }

  async killProcessesOnPort(port, serviceName) {
    try {
      this.log(`Checking port ${port} for ${serviceName}...`);

      // Find processes using the port
      const result = await this.execCommand(`netstat -ano | findstr :${port}`);

      if (result.trim()) {
        this.log(
          `Port ${port} is in use by ${serviceName}, killing processes...`,
          "warn"
        );

        // Extract PIDs from netstat output
        const lines = result.trim().split("\n");
        const pids = new Set();

        for (const line of lines) {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            pids.add(match[1]);
          }
        }

        // Kill each process
        for (const pid of pids) {
          try {
            this.log(`Killing process ${pid} on port ${port}...`);
            await this.execCommand(`taskkill /F /PID ${pid}`);
            this.log(`Successfully killed process ${pid}`, "success");
          } catch (killError) {
            this.log(
              `Failed to kill process ${pid}: ${killError.message}`,
              "warn"
            );
          }
        }

        // Also try to kill by process name for common services
        try {
          this.log(`Attempting to kill common processes on port ${port}...`);
          // Be selective - don't kill ALL node processes as that kills the supervisor too!
          await this.execCommand(`taskkill /F /IM npm.exe 2>nul`);
          await this.execCommand(`taskkill /F /IM next.exe 2>nul`);
          // Only kill node.exe processes that are NOT the supervisor
          await this.execCommand(
            `for /f "tokens=2" %i in ('tasklist /fi "imagename eq node.exe" /nh') do if %i neq ${process.pid} taskkill /F /PID %i 2>nul`
          );
        } catch (killError) {
          // Ignore errors for process name killing
        }

        // Wait a moment for ports to be released
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify port is now free
        const checkResult = await this.execCommand(
          `netstat -ano | findstr :${port}`
        );
        if (!checkResult.trim()) {
          this.log(`Port ${port} is now free for ${serviceName}`, "success");
        } else {
          this.log(
            `Warning: Port ${port} still appears to be in use, trying alternative method`,
            "warn"
          );

          // Try alternative method - kill Node.js processes excluding supervisor
          try {
            this.log(
              `Force killing Node.js processes (excluding supervisor)...`
            );
            await this.execCommand(
              `for /f "tokens=2" %i in ('tasklist /fi "imagename eq node.exe" /nh') do if %i neq ${process.pid} taskkill /F /PID %i 2>nul`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const finalCheck = await this.execCommand(
              `netstat -ano | findstr :${port}`
            );
            if (!finalCheck.trim()) {
              this.log(`Port ${port} is now free after force kill`, "success");
            } else {
              this.log(`Port ${port} still in use after force kill`, "error");
            }
          } catch (forceKillError) {
            this.log(`Force kill failed: ${forceKillError.message}`, "error");
          }
        }
      } else {
        this.log(`Port ${port} is available for ${serviceName}`, "success");
      }
    } catch (error) {
      this.log(`Error checking port ${port}: ${error.message}`, "warn");
    }
  }

  async buildPackages() {
    this.log("Building packages...");
    try {
      await this.execCommand("pnpm run build:packages");
      this.log("Packages built successfully", "success");
    } catch (error) {
      this.log("Failed to build packages", "error");
      throw error;
    }
  }

  async startPostgreSQLContainer() {
    this.log("Starting PostgreSQL container...");

    try {
      // Check if container already exists
      const containerExists = await this.checkContainerExists();

      if (containerExists) {
        this.log("PostgreSQL container already exists, starting it...");
        await this.execCommand(`docker start ${this.dbContainerName}`);
      } else {
        this.log("Creating new PostgreSQL container...");
        const containerPort = process.env.DB_CONTAINER_PORT || 5432;
        const hostPort = process.env.DB_PORT || 5432;
        await this.execCommand(
          `docker run -d --name ${this.dbContainerName} -e POSTGRES_USER=${this.dbUser} -e POSTGRES_PASSWORD=${this.dbPassword} -e POSTGRES_DB=${this.dbName} -p ${hostPort}:${containerPort} postgres:15`
        );
      }

      // Wait for container to be ready
      await this.waitForDatabase();
      this.log("PostgreSQL container is ready", "success");
    } catch (error) {
      this.log("Failed to start PostgreSQL container", "error");
      throw error;
    }
  }

  async checkContainerExists() {
    try {
      const result = await this.execCommand(
        `docker ps -a --filter name=${this.dbContainerName} --format "{{.Names}}"`
      );
      return result.trim() === this.dbContainerName;
    } catch (error) {
      return false;
    }
  }

  async waitForDatabase() {
    this.log("Waiting for database to be ready...");
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        await this.execCommand(
          `docker exec ${this.dbContainerName} pg_isready -U ${this.dbUser}`
        );
        return;
      } catch (error) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error("Database failed to become ready within 30 seconds");
  }

  async stopPostgreSQLContainer() {
    this.log("Stopping PostgreSQL container...");
    try {
      await this.execCommand(`docker stop ${this.dbContainerName}`);
      this.log("PostgreSQL container stopped", "success");
    } catch (error) {
      this.log("Failed to stop PostgreSQL container", "error");
    }
  }

  async removePostgreSQLContainer() {
    this.log("Removing PostgreSQL container...");
    try {
      await this.execCommand(`docker rm ${this.dbContainerName}`);
      this.log("PostgreSQL container removed", "success");
    } catch (error) {
      this.log("Failed to remove PostgreSQL container", "error");
    }
  }

  async resetDatabase() {
    this.log("Resetting database (this will remove all data)...");

    const confirm = await this.askQuestion(
      "Are you sure? Type 'yes' to confirm: "
    );
    if (confirm.toLowerCase() !== "yes") {
      this.log("Database reset cancelled", "info");
      return;
    }

    const confirm2 = await this.askQuestion(
      "Type 'DELETE-EVERYTHING' to confirm: "
    );
    if (confirm2 !== "DELETE-EVERYTHING") {
      this.log("Database reset cancelled", "info");
      return;
    }

    try {
      this.log("Stopping application stack...", "info");
      if (this.isRunning) {
        await this.stopApplicationStack();
      }

      this.log("Resetting PostgreSQL database...", "info");

      // Stop and remove existing container
      await this.stopPostgreSQLContainer();
      await this.removePostgreSQLContainer();

      // Start fresh container
      await this.startPostgreSQLContainer();

      this.log("✅ Database reset completed successfully!", "success");
      this.log(
        "🔄 All data has been deleted and a fresh database created",
        "info"
      );
      this.log(
        "💡 You can now start the application stack with option 1",
        "info"
      );
    } catch (error) {
      this.log("❌ Failed to reset database", "error");
      this.log(`Error details: ${error.message}`, "error");
    }
  }

  async startProcess(name, command, args, cwd, env = {}) {
    this.log(`Starting ${name}...`);

    const childProcess = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "production", ...env },
      shell: true, // Use shell on Windows
    });

    childProcess.stdout.on("data", (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    childProcess.stderr.on("data", (data) => {
      console.error(`[${name}] ${data.toString().trim()}`);
    });

    childProcess.on("close", (code) => {
      if (code !== 0) {
        this.log(`${name} exited with code ${code}`, "error");
        this.log(`Check the logs above for ${name} startup errors`, "error");
      } else {
        this.log(`${name} stopped`, "info");
      }
      delete this.processes[name];
    });

    childProcess.on("error", (error) => {
      this.log(`${name} process error: ${error.message}`, "error");
      this.log(
        `Failed to start ${name}. Check if the command exists and dependencies are installed.`,
        "error"
      );
    });

    this.processes[name] = childProcess;
    return childProcess;
  }

  async startServices() {
    this.log("Starting services...");

    const backendPort = process.env.BACKEND_PORT || 3470;
    const frontendPort = process.env.FRONTEND_PORT || 3469;
    const backendHost = process.env.BACKEND_HOST || "localhost";
    const frontendHost = process.env.FRONTEND_HOST || "localhost";

    // Set npm path first
    await this.initializeNpmPath();

    // Start backend with correct environment variables
    await this.startProcess(
      "backend",
      this.npmPath,
      ["start"],
      path.join(__dirname, "../backend-server"),
      {
        DB_HOST: "localhost",
        DB_PORT: this.dbPort.toString(),
        DB_NAME: "krapi",
        DB_USER: this.dbUser,
        DB_PASSWORD: this.dbPassword,
        BACKEND_PORT: backendPort.toString(),
        BACKEND_HOST: "localhost",
      }
    );

    // Wait a bit for backend to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Build frontend if needed
    await this.ensureFrontendBuilt();

    // Start frontend
    const frontendProcess = await this.startProcess(
      "frontend",
      this.npmPath,
      ["start"],
      path.join(__dirname, "../frontend-manager")
    );

    // Wait a moment for frontend to start and check if it's healthy
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if frontend is still running
    if (frontendProcess.killed || frontendProcess.exitCode !== null) {
      throw new Error(
        `Frontend server failed to start (exit code: ${frontendProcess.exitCode})`
      );
    }

    this.log("Frontend server started successfully", "success");

    this.log(
      `Backend running on http://${backendHost}:${backendPort}`,
      "success"
    );
    this.log(
      `Frontend running on http://${frontendHost}:${frontendPort}`,
      "success"
    );
  }

  async initializeNpmPath() {
    try {
      const npmLocation = await this.execCommand("where npm");
      const paths = npmLocation.trim().split("\n");
      // Use the .cmd version on Windows and quote if it has spaces
      const selectedPath = paths.find((p) => p.includes(".cmd")) || paths[0];
      this.npmPath = selectedPath.includes(" ")
        ? `"${selectedPath}"`
        : selectedPath;
      this.log(`Using npm path: ${this.npmPath}`, "info");
    } catch (error) {
      this.log("Could not find npm path, using default", "warn");
      this.npmPath = "npm";
    }
  }

  async ensureFrontendBuilt() {
    this.log("Ensuring frontend is built...");

    const frontendDistPath = path.join(__dirname, "../frontend-manager/.next");

    try {
      this.log("Building frontend (always build to ensure latest code)...");

      // Start the build process
      const buildProcess = await this.startProcess(
        "frontend-build",
        this.npmPath,
        ["run", "build"],
        path.join(__dirname, "../frontend-manager")
      );

      // Wait for the build process to complete
      await new Promise((resolve, reject) => {
        buildProcess.on("close", (code) => {
          if (code === 0) {
            this.log("Frontend build completed successfully", "success");
            resolve();
          } else {
            reject(new Error(`Frontend build failed with exit code ${code}`));
          }
        });

        buildProcess.on("error", (error) => {
          reject(error);
        });

        // Set a timeout in case the build hangs
        setTimeout(() => {
          buildProcess.kill("SIGTERM");
          reject(new Error("Frontend build timed out"));
        }, 120000); // 2 minutes timeout
      });

      // Wait a moment for file system to settle
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify build exists
      const fs = require("fs");
      if (!fs.existsSync(frontendDistPath)) {
        throw new Error("Frontend build failed - .next directory not found");
      }

      this.log("Frontend build verification successful", "success");
    } catch (error) {
      this.log("Failed to build frontend", "error");
      this.log(`Error: ${error.message}`, "error");
      throw error;
    }
  }

  async stopServices() {
    this.log("Stopping services gracefully...");

    // First, send SIGTERM to all processes
    for (const [name, process] of Object.entries(this.processes)) {
      this.log(`Stopping ${name}...`);
      try {
        process.kill("SIGTERM");
      } catch (error) {
        this.log(`Failed to stop ${name}: ${error.message}`, "warn");
      }
    }

    // Wait for graceful shutdown
    this.log("Waiting for services to shut down gracefully...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check which processes are still running
    const stillRunning = [];
    for (const [name, process] of Object.entries(this.processes)) {
      if (!process.killed && process.exitCode === null) {
        stillRunning.push(name);
      }
    }

    // Force kill any remaining processes
    if (stillRunning.length > 0) {
      this.log(
        `Force killing remaining processes: ${stillRunning.join(", ")}`,
        "warn"
      );
      for (const [name, process] of Object.entries(this.processes)) {
        if (!process.killed && process.exitCode === null) {
          try {
            process.kill("SIGKILL");
          } catch (error) {
            this.log(`Failed to force kill ${name}: ${error.message}`, "warn");
          }
        }
      }

      // Wait a bit more for force kill to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.processes = {};
    this.log("All services stopped", "success");
  }

  async showStatus() {
    this.log("=== KRAPI STATUS ===");

    // Check PostgreSQL container
    try {
      const containerStatus = await this.execCommand(
        `docker ps --filter name=${this.dbContainerName} --format "{{.Status}}"`
      );
      this.log(
        `PostgreSQL Container: ${containerStatus.trim() || "Not running"}`
      );
    } catch (error) {
      this.log("PostgreSQL Container: Not available");
    }

    // Check running processes
    this.log(`Running Processes: ${Object.keys(this.processes).length}`);
    for (const [name, process] of Object.entries(this.processes)) {
      const status = process.killed ? "STOPPED" : "RUNNING";
      this.log(`  - ${name}: ${status}`);
    }

    // Check service health
    try {
      const response = await fetch("http://localhost:3470/system/status");
      if (response.ok) {
        const status = await response.json();
        this.log(
          `Backend Health: ${status.healthy ? "✅ Healthy" : "❌ Unhealthy"}`
        );
        this.log(
          `Database: ${
            status.database?.connected ? "✅ Connected" : "❌ Disconnected"
          }`
        );
      } else {
        this.log(`Backend Health: ❌ HTTP ${response.status}`);
      }
    } catch (error) {
      this.log("Backend Health: ❌ Unreachable");
    }

    // Check frontend health
    try {
      const response = await fetch("http://localhost:3469");
      this.log(
        `Frontend Health: ${
          response.ok ? "✅ Running" : "❌ HTTP " + response.status
        }`
      );
    } catch (error) {
      this.log("Frontend Health: ❌ Unreachable");
    }

    // Overall status
    if (this.isRunning) {
      this.log("Overall Status: 🟢 RUNNING");
    } else {
      this.log("Overall Status: 🔴 STOPPED");
    }
  }

  async showLogs() {
    this.log("=== KRAPI LOGS ===");

    // Show container logs
    try {
      this.log("PostgreSQL Container Logs:");
      const containerLogs = await this.execCommand(
        `docker logs --tail 20 ${this.dbContainerName}`
      );
      console.log(containerLogs);
    } catch (error) {
      this.log("No PostgreSQL container logs available");
    }

    // Show application logs
    try {
      const response = await fetch("http://localhost:3001/system/logs");
      const logs = await response.json();
      this.log("Application Logs:");
      logs.forEach((log) => {
        console.log(
          `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
        );
      });
    } catch (error) {
      this.log("No application logs available");
    }
  }

  async installAsService() {
    this.log("Installing KRAPI as system service...");

    const platform = process.platform;

    if (platform === "win32") {
      await this.installWindowsService();
    } else if (platform === "linux") {
      await this.installLinuxService();
    } else {
      this.log("Service installation not supported on this platform", "error");
    }
  }

  async installWindowsService() {
    this.log("Installing Windows service...");
    try {
      // Create service script
      const serviceScript = `
@echo off
cd /d "${process.cwd()}"
node scripts/supervisor.js --service
      `.trim();

      fs.writeFileSync(
        path.join(__dirname, "krapi-service.bat"),
        serviceScript
      );

      // Install using nssm (if available)
      try {
        await this.execCommand("nssm install KrapiService");
        await this.execCommand(
          `nssm set KrapiService Application "${path.join(
            __dirname,
            "krapi-service.bat"
          )}"`
        );
        await this.execCommand(
          "nssm set KrapiService Start SERVICE_AUTO_START"
        );
        this.log("Windows service installed successfully", "success");
      } catch (error) {
        this.log(
          "nssm not found. Please install nssm to install as Windows service.",
          "error"
        );
      }
    } catch (error) {
      this.log("Failed to install Windows service", "error");
    }
  }

  async installLinuxService() {
    this.log("Installing Linux systemd service...");
    try {
      const serviceFile = `
[Unit]
Description=KRAPI Application Stack
After=network.target

[Service]
Type=simple
User=${process.env.USER || "root"}
WorkingDirectory=${process.cwd()}
ExecStart=/usr/bin/node scripts/supervisor.js --service
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
      `.trim();

      fs.writeFileSync("/tmp/krapi.service", serviceFile);
      await this.execCommand("sudo cp /tmp/krapi.service /etc/systemd/system/");
      await this.execCommand("sudo systemctl daemon-reload");
      await this.execCommand("sudo systemctl enable krapi.service");
      this.log("Linux systemd service installed successfully", "success");
    } catch (error) {
      this.log("Failed to install Linux service", "error");
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async showMenu() {
    console.log("\n=== KRAPI SUPERVISOR ===");
    console.log("1. Start Application Stack");
    console.log("2. Stop Application Stack");
    console.log("3. Show Status");
    console.log("4. Show Logs");
    console.log("5. Manage PostgreSQL Container");
    console.log("6. Install as System Service");
    console.log("7. Run Tests");
    console.log("9. Reset Database (DANGER - loses all data)");
    console.log("8. Exit");
    console.log("");
    if (this.isRunning) {
      console.log("🟢 Application stack is RUNNING");
    } else {
      console.log("🔴 Application stack is STOPPED");
    }
    console.log("");
  }

  async handleMenuChoice(choice) {
    switch (choice) {
      case "1":
        if (this.isRunning) {
          this.log("Application stack is already running!", "warn");
          this.log(
            "Use option 2 to stop it first, or option 3 to check status",
            "info"
          );
        } else {
          await this.startApplicationStack();
          this.log("\n✅ Application stack is now running!", "success");
          this.log(
            "💡 Use option 3 to check status, 4 for logs, or 2 to stop",
            "info"
          );
        }
        break;
      case "2":
        await this.stopApplicationStack();
        break;
      case "3":
        await this.showStatus();
        break;
      case "4":
        await this.showLogs();
        break;
      case "5":
        await this.managePostgreSQLContainer();
        break;
      case "6":
        await this.installAsService();
        break;
      case "7":
        await this.runTests();
        break;
      case "8":
        await this.exit();
        return false; // Exit the menu loop
      case "9":
        await this.resetDatabase();
        break;
      default:
        this.log("Invalid choice. Please try again.", "error");
    }
    return true; // Continue the menu loop
  }

  async startApplicationStack() {
    try {
      await this.checkDependencies();
      await this.buildPackages();
      await this.startPostgreSQLContainer();
      await this.startServices();
      this.isRunning = true;
      this.log("Application stack started successfully!", "success");
    } catch (error) {
      this.log("Failed to start application stack", "error");
      this.log(`Error details: ${error.message}`, "error");
    }
  }

  async stopApplicationStack() {
    try {
      await this.stopServices();
      await this.stopPostgreSQLContainer();
      this.isRunning = false;
      this.log("Application stack stopped successfully!", "success");
    } catch (error) {
      this.log("Failed to stop application stack", "error");
    }
  }

  async resetDatabase() {
    this.log("⚠️  DANGER: This will DELETE ALL DATA in the database!", "error");
    this.log(
      "This includes projects, collections, documents, users, and all application data.",
      "error"
    );

    const confirm1 = await this.askQuestion(
      "Type 'YES' to confirm you want to delete ALL data: "
    );
    if (confirm1 !== "YES") {
      this.log("Database reset cancelled", "info");
      return;
    }

    const confirm2 = await this.askQuestion(
      "Type 'DELETE-EVERYTHING' to confirm: "
    );
    if (confirm2 !== "DELETE-EVERYTHING") {
      this.log("Database reset cancelled", "info");
      return;
    }

    try {
      this.log("Stopping application stack...", "info");
      if (this.isRunning) {
        await this.stopApplicationStack();
      }

      this.log("Resetting PostgreSQL database...", "info");

      // Stop and remove existing container
      await this.stopPostgreSQLContainer();
      await this.removePostgreSQLContainer();

      // Start fresh container
      await this.startPostgreSQLContainer();

      this.log("✅ Database reset completed successfully!", "success");
      this.log(
        "🔄 All data has been deleted and a fresh database created",
        "info"
      );
      this.log(
        "💡 You can now start the application stack with option 1",
        "info"
      );
    } catch (error) {
      this.log("❌ Failed to reset database", "error");
      this.log(`Error details: ${error.message}`, "error");
    }
  }

  async managePostgreSQLContainer() {
    console.log("\n=== PostgreSQL Container Management ===");
    console.log("1. Start Container");
    console.log("2. Stop Container");
    console.log("3. Remove Container");
    console.log("4. Reset Database (Remove and recreate)");
    console.log("5. Show Container Status");
    console.log("6. Back to Main Menu");

    const choice = await this.askQuestion("Choose an option: ");

    switch (choice) {
      case "1":
        await this.startPostgreSQLContainer();
        break;
      case "2":
        await this.stopPostgreSQLContainer();
        break;
      case "3":
        await this.removePostgreSQLContainer();
        break;
      case "4":
        await this.resetDatabase();
        break;
      case "5":
        await this.showStatus();
        break;
      case "6":
        return;
      default:
        this.log("Invalid choice.", "error");
    }
  }

  async runTests() {
    this.log("Running unified comprehensive test suite...");

    // Check if services are already running
    if (this.isRunning) {
      this.log(
        "⚠️  Services are already running. Tests may conflict with running services.",
        "warn"
      );
      this.log(
        "💡 Consider stopping the application stack first for clean test results.",
        "info"
      );

      const choice = await this.askQuestion(
        "Continue with tests anyway? (y/N): "
      );
      if (choice.toLowerCase() !== "y" && choice.toLowerCase() !== "yes") {
        this.log("Tests cancelled.", "info");
        return;
      }
    }

    try {
      // Run the unified comprehensive tester
      const testProcess = spawn("node", ["unified-comprehensive-tester.js"], {
        stdio: "pipe",
        cwd: path.join(process.cwd(), "KRAPI-COMPREHENSIVE-TEST-SUITE"),
      });

      // Pipe test output to console
      testProcess.stdout.pipe(process.stdout);
      testProcess.stderr.pipe(process.stderr);

      // Wait for test completion
      await new Promise((resolve, reject) => {
        testProcess.on("close", (code) => {
          if (code === 0) {
            this.log("✅ Unified tests completed successfully!", "success");
            resolve();
          } else {
            this.log(`❌ Unified tests failed with exit code ${code}`, "error");
            reject(new Error(`Unified tests failed with exit code ${code}`));
          }
        });

        testProcess.on("error", (error) => {
          this.log(`❌ Unified test process error: ${error.message}`, "error");
          reject(error);
        });
      });
    } catch (error) {
      this.log(`❌ Unified tests failed: ${error.message}`, "error");
    }
  }

  async exit(exitCode = 0, stopServices = true) {
    this.log("Shutting down...");
    if (stopServices && this.isRunning) {
      await this.stopApplicationStack();
    }
    if (this.rl && !this.rl.closed) {
      this.rl.close();
    }
    if (exitCode !== undefined) {
      process.exit(exitCode);
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      try {
        if (this.rl && !this.rl.closed) {
          this.rl.question(question, (answer) => {
            resolve(answer.trim());
          });
        } else {
          resolve("8"); // Default to exit if readline is closed
        }
      } catch (error) {
        this.log(`Error in askQuestion: ${error.message}`, "error");
        resolve("8"); // Default to exit on error
      }
    });
  }

  async run() {
    // Handle command-line arguments for non-interactive operation
    if (process.argv.includes("--start")) {
      this.log(
        "Running with --start argument, automatically starting application stack...",
        "info"
      );
      try {
        await this.startApplicationStack();
        this.log("✅ Application stack started successfully!", "success");
        this.log("🔄 Services are now running independently...", "info");
        this.log(
          "💡 The supervisor will now exit. Services will continue running.",
          "info"
        );
        await this.exit(0, false);
      } catch (error) {
        this.log(
          `❌ Failed to start application stack: ${error.message}`,
          "error"
        );
        await this.exit(1);
      }
      return;
    }

    if (process.argv.includes("--test")) {
      this.log(
        "Running with --test argument, automatically running test suite...",
        "info"
      );
      try {
        await this.runTests();
        this.log("✅ Test suite completed!", "success");
        await this.exit(0);
      } catch (error) {
        this.log(`❌ Test suite failed: ${error.message}`, "error");
        await this.exit(1);
      }
      return;
    }

    // Handle service mode
    if (process.argv.includes("--service")) {
      this.log("Running in service mode...");
      await this.startApplicationStack();

      // Keep running indefinitely
      this.log(
        "Service mode active - keeping application stack running...",
        "info"
      );
      return new Promise(() => {}); // Keep alive forever
    }

    // Handle non-interactive mode (e.g., piped input like `echo "1" | npm run supervisor`)
    if (!process.stdin.isTTY) {
      this.log("Running in non-interactive mode...", "info");
      this.log("Automatically starting application stack...", "info");

      try {
        await this.startApplicationStack();
        this.log(
          "✅ Application stack started successfully in non-interactive mode!",
          "success"
        );
        this.log("🔄 Services are now running independently...", "info");
        this.log(
          "💡 The supervisor will now exit. Services will continue running.",
          "info"
        );

        // Exit gracefully, leaving services running
        await this.exit(0, false);
      } catch (error) {
        this.log(
          `❌ Failed to start application stack in non-interactive mode: ${error.message}`,
          "error"
        );
        await this.exit(1);
      }
    }

    // Interactive mode
    this.log("KRAPI Supervisor started", "success");
    this.log(
      "🚀 Type '1' to start the application stack, '3' for status, '8' to exit",
      "info"
    );

    while (true) {
      try {
        await this.showMenu();
        const choice = await this.askQuestion("Choose an option: ");

        const shouldContinue = await this.handleMenuChoice(choice);
        if (!shouldContinue) {
          break; // Exit requested
        }

        await this.askQuestion("\nPress Enter to continue...");
      } catch (error) {
        this.log(`Error in main loop: ${error.message}`, "error");
        this.log("Attempting to recover...", "info");

        try {
          const response = await this.askQuestion(
            "\nPress Enter to continue or type 'exit' to quit..."
          );
          if (response.toLowerCase() === "exit") {
            break;
          }
        } catch (recoveryError) {
          this.log("Recovery failed, exiting...", "error");
          break;
        }
      }
    }

    // Clean exit
    await this.exit();
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  if (supervisor) {
    await supervisor.exit();
  }
});

process.on("SIGINT", async () => {
  if (supervisor) {
    await supervisor.exit();
  }
});

const supervisor = new KrapiSupervisor();
supervisor.run().catch(console.error);
