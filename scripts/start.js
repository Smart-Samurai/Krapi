#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Load environment variables
require("dotenv").config();

class KrapiManager {
  constructor() {
    this.processes = new Map();
    this.logs = [];
    this.isShuttingDown = false;

    // Setup graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
    process.on("uncaughtException", (error) => this.handleError(error));
    process.on("unhandledRejection", (reason) => this.handleError(reason));
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.logs.push(logMessage);
  }

  handleError(error) {
    this.log(`Uncaught error: ${error.message || error}`, "error");
    if (error.stack) {
      this.log(error.stack, "error");
    }

    // Don't exit on error, try to recover
    if (!this.isShuttingDown) {
      this.log("Attempting to recover from error...", "warn");
    }
  }

  async initEnvironment() {
    this.log("Initializing environment configuration...");
    try {
      const { main: initEnv } = require("./init-env.js");
      await initEnv();
    } catch (error) {
      this.log(
        `Warning: Failed to initialize environment: ${error.message}`,
        "warn"
      );
      this.log("Continuing with existing .env file if it exists...", "warn");
    }
  }

  async checkDependencies() {
    this.log("Checking dependencies...");

    const packages = ["backend-server", "frontend-manager"];
    for (const pkg of packages) {
      const packagePath = path.join(__dirname, "..", pkg);
      if (!fs.existsSync(path.join(packagePath, "node_modules"))) {
        this.log(`Installing dependencies for ${pkg}...`);
        await this.runCommand("pnpm install", packagePath);
      }
    }
  }

  async buildPackages() {
    this.log("Building packages...");

    // Build logger package
    await this.runCommand(
      "pnpm run build",
      path.join(__dirname, "..", "backend-server", "packages", "krapi-logger")
    );

    // Build backend
    await this.runCommand(
      "pnpm run build",
      path.join(__dirname, "..", "backend-server")
    );
  }

  runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command} in ${cwd}`);
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          this.log(`Command failed: ${error.message}`, "error");
          reject(error);
        } else {
          if (stdout) this.log(stdout.trim());
          if (stderr) this.log(stderr.trim(), "warn");
          resolve();
        }
      });
    });
  }

  startProcess(name, command, cwd, env = {}) {
    this.log(`Starting ${name}...`);

    const processEnv = {
      ...process.env,
      ...env,
      NODE_ENV: process.env.NODE_ENV || "development",
    };

    const child = spawn("node", command.split(" "), {
      cwd,
      env: processEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[${name}] ${output}`);
      }
    });

    child.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[${name}] ${output}`, "error");
      }
    });

    child.on("error", (error) => {
      this.log(`Process ${name} error: ${error.message}`, "error");
    });

    child.on("exit", (code, signal) => {
      if (!this.isShuttingDown) {
        this.log(
          `Process ${name} exited with code ${code}${
            signal ? ` (${signal})` : ""
          }`,
          "warn"
        );

        // Restart process if it's not a graceful shutdown
        if (code !== 0 && !this.isShuttingDown) {
          this.log(`Restarting ${name} in 5 seconds...`, "warn");
          setTimeout(() => {
            if (!this.isShuttingDown) {
              this.startProcess(name, command, cwd, env);
            }
          }, 5000);
        }
      }
    });

    this.processes.set(name, child);
    return child;
  }

  async startServices() {
    this.log("🚀 Starting KRAPI Services...");

    // Start backend
    this.startProcess(
      "backend",
      "dist/app.js",
      path.join(__dirname, "..", "backend-server"),
      {
        PORT: process.env.BACKEND_PORT || "3470",
        HOST: process.env.BACKEND_HOST || "localhost",
      }
    );

    // Wait a bit for backend to start
    await this.sleep(3000);

    // Start frontend
    this.startProcess(
      "frontend",
      "next dev",
      path.join(__dirname, "..", "frontend-manager"),
      {
        PORT: process.env.FRONTEND_PORT || "3469",
        HOST: process.env.FRONTEND_HOST || "localhost",
      }
    );

    this.log("✅ All services started successfully!");
    this.log(
      `🌐 Frontend: http://localhost:${process.env.FRONTEND_PORT || "3469"}`
    );
    this.log(
      `🔧 Backend: http://localhost:${process.env.BACKEND_PORT || "3470"}`
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async shutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.log("🛑 Shutting down KRAPI services...");

    for (const [name, process] of this.processes) {
      this.log(`Stopping ${name}...`);
      process.kill("SIGTERM");

      // Force kill after 10 seconds
      setTimeout(() => {
        if (!process.killed) {
          this.log(`Force killing ${name}...`, "warn");
          process.kill("SIGKILL");
        }
      }, 10000);
    }

    // Wait for all processes to exit
    const exitPromises = Array.from(this.processes.values()).map((process) => {
      return new Promise((resolve) => {
        process.on("exit", resolve);
        if (process.killed) resolve();
      });
    });

    await Promise.all(exitPromises);
    this.log("✅ All services stopped successfully!");
    process.exit(0);
  }

  showStatus() {
    this.log("📊 KRAPI Service Status:");
    for (const [name, process] of this.processes) {
      const status = process.killed ? "❌ Stopped" : "✅ Running";
      this.log(`  ${name}: ${status} (PID: ${process.pid})`);
    }
  }

  showLogs(limit = 50) {
    this.log(`📋 Last ${limit} log entries:`);
    const recentLogs = this.logs.slice(-limit);
    recentLogs.forEach((log) => console.log(log));
  }
}

async function main() {
  const manager = new KrapiManager();

  const command = process.argv[2];

  switch (command) {
    case "start":
      try {
        await manager.initEnvironment();
        await manager.checkDependencies();
        await manager.buildPackages();
        await manager.startServices();

        // Keep the process alive
        process.stdin.resume();
      } catch (error) {
        manager.log(`Failed to start services: ${error.message}`, "error");
        process.exit(1);
      }
      break;

    case "status":
      manager.showStatus();
      break;

    case "logs":
      const limit = parseInt(process.argv[3]) || 50;
      manager.showLogs(limit);
      break;

    case "stop":
      await manager.shutdown();
      break;

    default:
      console.log(`
🚀 KRAPI Manager

Usage:
  node scripts/start.js start    - Start all services
  node scripts/start.js status   - Show service status
  node scripts/start.js logs     - Show recent logs
  node scripts/start.js stop     - Stop all services

Environment:
  Make sure to copy env.example to .env and configure your settings.
      `);
      break;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
