#!/usr/bin/env node
/**
 * Start KRAPI in development mode with database
 * This script initializes .env if it doesn't exist, then starts the development server
 */

const { spawn } = require("child_process");
const path = require("path");

async function main() {
  console.log("🚀 Starting KRAPI in development mode with database...\n");

  // Initialize environment first
  console.log("📝 Initializing environment configuration...");
  try {
    const { main: initEnv } = require("./scripts/init-env.js");
    await initEnv();
  } catch (error) {
    console.warn(`⚠️  Warning: Failed to initialize environment: ${error.message}`);
    console.warn("Continuing with existing .env file if it exists...\n");
  }

  // Start the dev server
  console.log("🔧 Starting development server...\n");
  
  const devProcess = spawn("npm", ["run", "dev:all"], {
    cwd: path.resolve(__dirname),
    stdio: "inherit",
    shell: true,
  });

  devProcess.on("error", (error) => {
    console.error(`❌ Failed to start development server: ${error.message}`);
    process.exit(1);
  });

  devProcess.on("exit", (code) => {
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    devProcess.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down...");
    devProcess.kill("SIGTERM");
  });
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

