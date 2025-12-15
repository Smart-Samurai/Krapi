/**
 * Frontend Build Manager
 * Handles building the frontend for production
 */

import { detectPackageManager } from "./package-manager.js";
import { runCommand } from "./command-runner.js";

export async function buildFrontend(projectRoot, log) {
  log("🔨 Building frontend for production...", "INFO");
  
  const packageManager = await detectPackageManager();
  // Force npm as requested
  const buildCommand = "npm run build:frontend";

  log(`   Running: ${buildCommand}`, "INFO");
  const result = await runCommand(buildCommand, { cwd: projectRoot });

  if (!result.success) {
    const buildError = new Error(`Failed to build frontend`);
    buildError.buildOutput = result.stdout || result.stderr || "";
    buildError.buildCommand = buildCommand;
    throw buildError;
  }

  log("✅ Frontend built successfully", "SUCCESS");
  return packageManager;
}


