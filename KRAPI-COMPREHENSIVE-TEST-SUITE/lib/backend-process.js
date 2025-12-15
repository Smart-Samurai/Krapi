/**
 * Backend Process Manager
 * Handles starting and stopping the backend process
 */

import { spawn } from "child_process";
import { CONFIG } from "../config.js";
import { detectPackageManager } from "./package-manager.js";

export async function startBackend(projectRoot, packageManager, log) {
  log("🚀 Starting backend...", "INFO");
  
  if (!packageManager) {
    packageManager = await detectPackageManager();
  }

  const startCommand = ["run", "dev:backend"];

  const backendProcess = spawn(
    packageManager,
    startCommand,
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    }
  );

  // Log backend output
  backendProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();
    if (output && process.env.VERBOSE === "true") {
      log(`   [Backend] ${output}`, "INFO");
    }
  });

  backendProcess.stderr.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      const isHarmlessWarning =
        output.includes("ExperimentalWarning") ||
        output.includes("DeprecationWarning");
      
      if (!isHarmlessWarning) {
        log(`   [Backend Error] ${output}`, "WARNING");
      }
    }
  });

  backendProcess.on("error", (error) => {
    log(`❌ Failed to start backend: ${error.message}`, "ERROR");
  });

  // Wait for backend to be ready
  log("   Waiting for backend to be ready...", "INFO");
  await waitForBackendReady(60000, log);
  log("✅ Backend started successfully", "SUCCESS");

  return backendProcess;
}

async function waitForBackendReady(timeout = 60000, log) {
  const startTime = Date.now();
  const checkInterval = 1000;

  while (Date.now() - startTime < timeout) {
    try {
      // Try both /health and /krapi/k1/health endpoints
      const healthUrl = `${CONFIG.BACKEND_URL}/health`;
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Backend not ready yet, continue waiting
    }
    
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Backend did not become ready within ${timeout}ms`);
}

export async function stopBackend(backendProcess, log) {
  if (backendProcess) {
    log("🛑 Stopping backend...", "INFO");
    try {
      const pid = backendProcess.pid;
      
      // On Windows, use taskkill with /T to kill process tree (nodemon + child node processes)
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
        backendProcess.kill("SIGTERM");
        
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            backendProcess.kill("SIGKILL");
            resolve();
          }, 5000);
          
          backendProcess.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      log("✅ Backend stopped", "SUCCESS");
    } catch (error) {
      log(`⚠️  Error stopping backend: ${error.message}`, "WARNING");
    }
  }
}

