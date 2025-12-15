/**
 * Port Cleanup Utility
 * Kills processes running on specified ports
 */

import { runCommand } from "./command-runner.js";

/**
 * Kill process on a specific port
 * @param {number} port - Port number to free
 * @param {Function} log - Logging function
 */
export async function killProcessOnPort(port, log) {
  try {
    // Try Linux/Unix command first (lsof) - silently fail on Windows
    let result = await runCommand(`lsof -ti:${port}`, {
      ignoreStderr: true,
    });
    if (result.success && result.stdout && result.stdout.trim()) {
      const pid = result.stdout.trim();
      if (pid) {
        log(`   Killing process ${pid} on port ${port}...`, "INFO");
        const killResult = await runCommand(`kill -9 ${pid}`, {
          ignoreStderr: true,
        });
        if (killResult.success) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return; // Successfully killed, exit early
        }
      }
    }

    // Fallback to fuser (another Linux command) - silently fail on Windows
    result = await runCommand(`fuser -k ${port}/tcp`, {
      ignoreStderr: true,
    });
    if (result.success) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return; // Successfully killed, exit early
    }

    // If both fail, try Windows commands as fallback
    result = await runCommand(`netstat -ano | findstr :${port}`, {
      ignoreStderr: true,
    });
    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n");
      const pids = new Set(); // Use Set to collect unique PIDs

      // Extract unique PIDs from netstat output
      for (const line of lines) {
        if (line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0" && /^\d+$/.test(pid)) {
            pids.add(pid);
          }
        }
      }

      // Kill each unique PID only once
      for (const pid of pids) {
        log(`   Killing process ${pid} on port ${port}...`, "INFO");
        await runCommand(`taskkill /PID ${pid} /F`, {
          ignoreStderr: true,
        });
      }
      
      if (pids.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    // Silently ignore cleanup errors - processes might already be gone
  }
}

/**
 * Kill processes on frontend and backend ports
 * @param {Function} log - Logging function
 */
export async function cleanupPorts(log) {
  log("🧹 Cleaning up ports...", "INFO");
  await killProcessOnPort(3498, log); // Frontend
  await killProcessOnPort(3470, log); // Backend
  log("✅ Port cleanup complete", "SUCCESS");
}

