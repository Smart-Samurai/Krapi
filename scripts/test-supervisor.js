#!/usr/bin/env node

const { exec } = require("child_process");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function testSupervisor() {
  console.log("🧪 Testing KRAPI Supervisor...\n");

  // Test 1: Check if supervisor script exists and is executable
  console.log("1. Checking supervisor script...");
  try {
    const fs = require("fs");
    const supervisorPath = path.join(__dirname, "supervisor.js");
    if (fs.existsSync(supervisorPath)) {
      console.log("✅ Supervisor script exists");
    } else {
      console.log("❌ Supervisor script not found");
      return;
    }
  } catch (error) {
    console.log("❌ Error checking supervisor script:", error.message);
    return;
  }

  // Test 2: Check dependencies
  console.log("\n2. Checking dependencies...");

  // Check Docker
  try {
    await execCommand("docker --version");
    console.log("✅ Docker is available");
  } catch (error) {
    console.log("❌ Docker is not available");
  }

  // Check pnpm
  try {
    await execCommand("pnpm --version");
    console.log("✅ pnpm is available");
  } catch (error) {
    console.log("❌ pnpm is not available");
  }

  // Test 3: Check PostgreSQL container
  console.log("\n3. Checking PostgreSQL container...");
  const containerName = process.env.DB_CONTAINER_NAME || "krapi-postgres";
  try {
    const result = await execCommand(
      `docker ps -a --filter name=${containerName} --format "{{.Names}}"`
    );
    if (result.trim() === containerName) {
      console.log("✅ PostgreSQL container exists");

      // Check if it's running
      const runningResult = await execCommand(
        `docker ps --filter name=${containerName} --format "{{.Names}}"`
      );
      if (runningResult.trim() === containerName) {
        console.log("✅ PostgreSQL container is running");
      } else {
        console.log("ℹ️ PostgreSQL container exists but is not running");
      }
    } else {
      console.log("ℹ️ PostgreSQL container does not exist");
    }
  } catch (error) {
    console.log("❌ Error checking PostgreSQL container:", error.message);
  }

  // Test 4: Check if packages are built
  console.log("\n4. Checking built packages...");
  const packages = [
    "krapi-logger",
    "krapi-error-handler",
    "krapi-monitor",
    "krapi-sdk",
  ];
  for (const pkg of packages) {
    const packagePath = path.join(__dirname, "..", "packages", pkg, "dist");
    try {
      const fs = require("fs");
      if (fs.existsSync(packagePath)) {
        console.log(`✅ ${pkg} is built`);
      } else {
        console.log(`❌ ${pkg} is not built`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${pkg}:`, error.message);
    }
  }

  // Test 5: Check backend build
  console.log("\n5. Checking backend build...");
  const backendDistPath = path.join(__dirname, "..", "backend-server", "dist");
  try {
    const fs = require("fs");
    if (fs.existsSync(backendDistPath)) {
      console.log("✅ Backend is built");
    } else {
      console.log("❌ Backend is not built");
    }
  } catch (error) {
    console.log("❌ Error checking backend build:", error.message);
  }

  // Test 6: Check environment configuration
  console.log("\n6. Checking environment configuration...");
  const requiredEnvVars = [
    "DB_CONTAINER_NAME",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "BACKEND_PORT",
    "FRONTEND_PORT",
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`ℹ️ ${envVar} is not set (using default)`);
    }
  }

  console.log("\n🎉 Supervisor test completed!");
  console.log("\nTo run the supervisor:");
  console.log("  npm run supervisor");
  console.log("\nTo run in service mode:");
  console.log("  npm run supervisor:service");
}

function execCommand(command) {
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

testSupervisor().catch(console.error);
