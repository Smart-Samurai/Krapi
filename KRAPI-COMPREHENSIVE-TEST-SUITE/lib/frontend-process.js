/**
 * Frontend Process Manager
 * Handles starting and stopping the frontend process
 */

import { spawn } from "child_process";
import { join } from "path";
import { CONFIG } from "../config.js";
import { detectPackageManager } from "./package-manager.js";

export async function startFrontend(projectRoot, packageManager, log) {
  log("🚀 Starting frontend in production mode...", "INFO");
  
  if (!packageManager) {
    packageManager = await detectPackageManager();
  }

  const frontendDir = join(projectRoot, "frontend-manager");
  const startCommand = ["run", "start"];

  const frontendProcess = spawn(
    packageManager,
    startCommand,
    {
      cwd: frontendDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    }
  );

  // Log frontend output
  frontendProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();
    if (output && process.env.VERBOSE === "true") {
      log(`   [Frontend] ${output}`, "INFO");
    }
  });

  frontendProcess.stderr.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      const isHarmlessWarning =
        output.includes("ExperimentalWarning") ||
        output.includes("DeprecationWarning");
      
      if (!isHarmlessWarning) {
        log(`   [Frontend Error] ${output}`, "WARNING");
      }
    }
  });

  frontendProcess.on("error", (error) => {
    log(`❌ Failed to start frontend: ${error.message}`, "ERROR");
  });

  // Wait for frontend to be ready
  log("   Waiting for frontend to be ready...", "INFO");
  await waitForFrontendReady(60000, log);
  log("✅ Frontend started successfully", "SUCCESS");

  return frontendProcess;
}

async function waitForFrontendReady(timeout = 60000, log) {
  const startTime = Date.now();
  const checkInterval = 1000;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${CONFIG.FRONTEND_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Frontend not ready yet, continue waiting
    }
    
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Frontend did not become ready within ${timeout}ms`);
}

export async function stopFrontend(frontendProcess, log) {
  if (frontendProcess) {
    log("🛑 Stopping frontend...", "INFO");
    try {
      const pid = frontendProcess.pid;
      
      // On Windows, use taskkill with /T to kill process tree
      if (process.platform === "win32" && pid) {
        const { exec } = await import("child_process");
        await new Promise((resolve) => {
          exec(`taskkill /PID ${pid} /T /F`, (error) => {
            // Ignore errors - process might already be gone
            resolve();
          });
        });
        // Give Windows time to clean up
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Unix: SIGTERM then SIGKILL
        frontendProcess.kill("SIGTERM");
        
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            frontendProcess.kill("SIGKILL");
            resolve();
          }, 5000);
          
          frontendProcess.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      log("✅ Frontend stopped", "SUCCESS");
    } catch (error) {
      log(`⚠️  Error stopping frontend: ${error.message}`, "WARNING");
    }
  }
}


