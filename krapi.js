#!/usr/bin/env node
/**
 * KRAPI - One-Click Setup & Management
 * 
 * Single entry point for installing, setting up, and managing KRAPI.
 * Works on Windows, Linux, and Mac.
 * 
 * Usage:
 *   node krapi.js          # Interactive mode
 *   npm run krapi          # Same (via package.json)
 */

const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rootDir = __dirname;
let rl = null;

// Colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, "red");
}

function success(message) {
  log(`✅ ${message}`, "green");
}

function info(message) {
  log(`ℹ️  ${message}`, "blue");
}

function warn(message) {
  log(`⚠️  ${message}`, "yellow");
}

function title(message) {
  log(`\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);
}

/**
 * Execute command and return promise
 * For commands that need to show output, use spawn with stdio: 'inherit'
 */
function execCommand(command, cwd = rootDir, silent = false, showOutput = true) {
  return new Promise((resolve, reject) => {
    if (!silent && showOutput) {
      info(`Running: ${command}`);
    }
    
    // For commands that need to show output, use spawn with stdio: inherit
    // Use shell: true to handle complex commands properly
    if (showOutput) {
      const isWindows = process.platform === "win32";
      const child = spawn(command, [], {
        cwd,
        stdio: "inherit",
        shell: isWindows ? "cmd.exe" : true,
      });
      
      child.on("exit", (code) => {
        if (code === 0) {
          resolve({ stdout: "", stderr: "" });
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });
      
      child.on("error", (err) => {
        reject(err);
      });
    } else {
      // For silent commands, use exec
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    }
  });
}

/**
 * Ask question
 */
function askQuestion(question) {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Confirm prompt
 */
async function confirm(message) {
  const answer = await askQuestion(`${message} (y/N): `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Check if node_modules exists and has actual dependencies
 */
function isInstalled() {
  const nodeModules = path.join(rootDir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    return false;
  }
  // Check if key dependencies exist
  const nextPath = path.join(rootDir, "frontend-manager", "node_modules", "next");
  const expressPath = path.join(rootDir, "backend-server", "node_modules", "express");
  // If either is missing, we need to install
  return fs.existsSync(nextPath) || fs.existsSync(expressPath);
}

/**
 * Check if packages are built and installed
 */
function arePackagesBuilt() {
  // Check if dist folders exist (packages are built)
  const loggerDist = path.join(rootDir, "backend-server", "packages", "krapi-logger", "dist");
  const errorHandlerDist = path.join(rootDir, "backend-server", "packages", "krapi-error-handler", "dist");
  const monitorDist = path.join(rootDir, "backend-server", "packages", "krapi-monitor", "dist");
  
  // Check if packages are installed in backend-server/node_modules
  const loggerInstalled = fs.existsSync(path.join(rootDir, "backend-server", "node_modules", "@krapi", "logger"));
  const errorHandlerInstalled = fs.existsSync(path.join(rootDir, "backend-server", "node_modules", "@krapi", "error-handler"));
  const monitorInstalled = fs.existsSync(path.join(rootDir, "backend-server", "node_modules", "@krapi", "monitor"));
  
  // All packages must be built (dist exists) AND installed (in node_modules)
  const allBuilt = fs.existsSync(loggerDist) && fs.existsSync(errorHandlerDist) && fs.existsSync(monitorDist);
  const allInstalled = loggerInstalled && errorHandlerInstalled && monitorInstalled;
  
  return allBuilt && allInstalled;
}

/**
 * Check if .env files exist
 */
function isEnvInitialized() {
  return fs.existsSync(path.join(rootDir, ".env"));
}

/**
 * Check if services are built
 */
function areServicesBuilt() {
  const backendDist = path.join(rootDir, "backend-server", "dist");
  const frontendDist = path.join(rootDir, "frontend-manager", ".next");
  return fs.existsSync(backendDist) && fs.existsSync(frontendDist);
}

/**
 * First-time setup
 */
async function firstTimeSetup() {
  title("🚀 KRAPI First-Time Setup");
  
  info("This will install dependencies, build packages, and initialize environment.");
  const proceed = await confirm("Continue with setup?");
  
  if (!proceed) {
    info("Setup cancelled.");
    process.exit(0);
  }
  
  try {
    // Step 1: Install dependencies
    title("Step 1/4: Installing Dependencies");
    info("This may take a few minutes...");
    await execCommand("npm install");
    success("Dependencies installed!");
    
    // Step 2: Initialize environment
    title("Step 2/4: Initializing Environment");
    await execCommand("npm run init-env");
    success("Environment initialized!");
    
    // Step 3: Build packages
    title("Step 3/4: Building Packages");
    await execCommand("npm run build:packages");
    success("Packages built!");
    
    // Step 4: Show next steps
    title("Step 4/4: Setup Complete!");
    success("KRAPI is ready to use!");
    info("\nDefault login credentials:");
    info("  Username: admin");
    info("  Password: admin123");
    warn("⚠️  IMPORTANT: Change the default password after first login!");
    
    info("\nNext steps:");
    info("  1. Start KRAPI: Select option 1 from the main menu");
    info("  2. Open http://localhost:3498 in your browser");
    info("  3. Log in and change your password");
    
    await askQuestion("\nPress Enter to continue to main menu...");
    
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    process.exit(1);
  }
}

/**
 * Show main menu
 */
function showMainMenu() {
  console.clear();
  title("🎯 KRAPI Management");
  
  console.log(`
  ${colors.bright}Main Menu:${colors.reset}
  
  ${colors.green}1.${colors.reset} Start KRAPI
  ${colors.green}2.${colors.reset} Stop KRAPI
  ${colors.green}3.${colors.reset} Restart KRAPI
  ${colors.green}4.${colors.reset} Check Status
  ${colors.green}5.${colors.reset} View Logs
  ${colors.green}6.${colors.reset} Configuration
  ${colors.green}7.${colors.reset} Advanced Options
  ${colors.green}8.${colors.reset} Reset App State ${colors.dim}(Delete all data & rebuild)${colors.reset}
  ${colors.green}9.${colors.reset} Clean Test Projects ${colors.dim}(Remove test data only)${colors.reset}
  ${colors.green}0.${colors.reset} Exit
  
  `);
}

/**
 * Check service status
 */
async function checkStatus(nonInteractive = false) {
  const frontendPort = 3498;
  const backendPort = 3470;
  
  const command = process.platform === "win32"
    ? `netstat -ano | findstr :${frontendPort} && netstat -ano | findstr :${backendPort}`
    : `lsof -i :${frontendPort} && lsof -i :${backendPort}`;
  
  try {
    const { stdout } = await execCommand(command, rootDir, true, false);
    const frontendRunning = stdout.includes(frontendPort.toString());
    const backendRunning = stdout.includes(backendPort.toString());
    
    if (!nonInteractive) {
      title("Service Status");
      if (frontendRunning) {
        success(`Frontend: Running on port ${frontendPort}`);
        info(`   URL: http://localhost:${frontendPort}`);
      } else {
        warn(`Frontend: Not running (port ${frontendPort})`);
      }
      
      if (backendRunning) {
        success(`Backend: Running on port ${backendPort}`);
      } else {
        warn(`Backend: Not running (port ${backendPort})`);
      }
    }
    
    return { frontendRunning, backendRunning };
  } catch (err) {
    if (!nonInteractive) {
      title("Service Status");
      warn("Frontend: Not running");
      warn("Backend: Not running");
    }
    return { frontendRunning: false, backendRunning: false };
  }
}

/**
 * Smart startup - checks and sets up only what's needed
 */
async function smartStartup(nonInteractive = false) {
  if (!nonInteractive) {
    title("🚀 Smart Startup");
  }
  
  // 1. Check dependencies - always install root first
  if (!isInstalled()) {
    if (!nonInteractive) info("Dependencies not found, installing...");
    await execCommand("npm install", rootDir, nonInteractive, false);
    if (!nonInteractive) success("Dependencies installed!");
  } else if (!nonInteractive) {
    info("✓ Dependencies already installed");
  }
  
  // Install subdirectory dependencies
  const subdirs = ["backend-server", "frontend-manager"];
  for (const dir of subdirs) {
    const subdirPath = path.join(rootDir, dir);
    const subdirNodeModules = path.join(subdirPath, "node_modules");
    if (!fs.existsSync(subdirNodeModules)) {
      if (!nonInteractive) info(`Installing dependencies in ${dir}...`);
      await execCommand("npm install", subdirPath, nonInteractive, false);
    }
  }
  
  // 2. Check packages - build AND install them
  if (!arePackagesBuilt()) {
    if (!nonInteractive) info("Packages not built, building...");
    await execCommand("npm run build:packages", rootDir, nonInteractive, false);
    // After building, install them in backend-server
    if (!nonInteractive) info("Installing packages in backend-server...");
    await execCommand("npm install", path.join(rootDir, "backend-server"), nonInteractive, false);
    if (!nonInteractive) success("Packages built and installed!");
  } else if (!nonInteractive) {
    info("✓ Packages already built");
  }
  
  // 3. Check frontend/backend builds
  if (!areServicesBuilt()) {
    if (!nonInteractive) info("Services not built, building...");
    await execCommand("npm run build:backend", rootDir, nonInteractive, false);
    await execCommand("npm run build:frontend", rootDir, nonInteractive, false);
    if (!nonInteractive) success("Services built!");
  } else if (!nonInteractive) {
    info("✓ Services already built");
  }
  
  // 4. Check environment
  if (!isEnvInitialized()) {
    if (!nonInteractive) info("Environment not initialized, setting up...");
    await execCommand("npm run init-env", rootDir, nonInteractive, false);
    if (!nonInteractive) success("Environment initialized!");
  } else if (!nonInteractive) {
    info("✓ Environment already initialized");
  }
  
  // 5. Start services (database init happens automatically)
  await startServices("prod", nonInteractive);
}

/**
 * Start services
 */
async function startServices(mode = "prod", nonInteractive = false) {
  if (!nonInteractive) {
    title(`Starting KRAPI (${mode} mode)`);
  }
  
  // Check if already running
  const status = await checkStatus(nonInteractive);
  
  if (status.frontendRunning || status.backendRunning) {
    if (!nonInteractive) {
      warn("Services appear to be running already!");
      const restart = await confirm("Restart services?");
      if (restart) {
        await stopServices();
      } else {
        return;
      }
    } else {
      // Non-interactive: auto-restart
      await stopServices();
      // Wait a bit for ports to be released
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  
  info("Starting services...");
  info("This will start both backend and frontend.");
  info("Press Ctrl+C to stop services.");
  
  // Load config to get frontend URL
  let frontendUrl = "http://localhost:3498"; // Default
  try {
    const configPath = path.join(rootDir, "config", "krapi-config.json");
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(configContent);
      if (config.frontend && config.frontend.url) {
        frontendUrl = config.frontend.url;
      }
    }
  } catch (err) {
    // Use default if config can't be loaded
  }
  
  // Use the existing krapi-manager script directly
  // Use absolute path and normalize it to handle spaces properly
  const scriptPath = path.resolve(rootDir, "scripts", "krapi-manager.js");
  const args = ["start"];
  if (mode === "prod") {
    args.push("--prod");
  } else {
    args.push("--dev");
  }
  
  // Spawn in foreground so user can see output
  // Pass path directly - spawn handles spaces correctly when shell is false
  const child = spawn("node", [scriptPath, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false, // Don't use shell - this handles paths with spaces correctly
  });
  
  // Wait a bit for services to start, then show the frontend URL
  // Check multiple times to catch when services are ready
  let checkCount = 0;
  const maxChecks = 12; // Check for up to 60 seconds (12 * 5s)
  const checkInterval = setInterval(async () => {
    try {
      const status = await checkStatus(true); // Silent check
      if (status.frontendRunning && status.backendRunning && !nonInteractive) {
        clearInterval(checkInterval);
        // Small delay to let the service output finish
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("");
        console.log(colors.bright + "=".repeat(60) + colors.reset);
        console.log(colors.green + "✅ KRAPI is ready!" + colors.reset);
        console.log("");
        console.log(colors.bright + "🌐 Frontend Web UI:" + colors.reset);
        console.log(colors.cyan + `   ${frontendUrl}` + colors.reset);
        console.log("");
        console.log(colors.dim + "   Open this URL in your browser to access the KRAPI interface." + colors.reset);
        console.log(colors.bright + "=".repeat(60) + colors.reset);
        console.log("");
      } else {
        checkCount++;
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      }
    } catch (err) {
      // Ignore errors in status check
      checkCount++;
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
      }
    }
  }, 5000); // Check every 5 seconds
  
  // Handle Ctrl+C
  process.on("SIGINT", () => {
    info("\nStopping services...");
    child.kill();
    process.exit(0);
  });
  
  // Handle Ctrl+C
  process.on("SIGINT", () => {
    clearInterval(checkInterval);
    info("\nStopping services...");
    child.kill();
    process.exit(0);
  });
  
  child.on("exit", (code) => {
    clearInterval(checkInterval);
    if (code !== 0) {
      error("Services stopped with error");
    } else {
      success("Services stopped");
    }
  });
}

/**
 * Stop services
 */
async function stopServices() {
  title("Stopping KRAPI");
  info("Stopping all services...");
  
  try {
    await execCommand("node scripts/krapi-manager.js stop");
    success("Services stopped!");
  } catch (err) {
    warn("Error stopping services (they may not be running)");
  }
}

/**
 * View logs
 */
async function viewLogs() {
  title("Viewing Logs");
  
  console.log(`
  ${colors.green}1.${colors.reset} Frontend logs
  ${colors.green}2.${colors.reset} Backend logs
  ${colors.green}3.${colors.reset} Both (frontend + backend)
  ${colors.green}0.${colors.reset} Back to main menu
    `);
  
  const serviceChoice = await askQuestion("Select service: ");
  let service = "both";
  if (serviceChoice.trim() === "1") service = "frontend";
  else if (serviceChoice.trim() === "2") service = "backend";
  else if (serviceChoice.trim() === "0") return;
  
  console.log(`
  ${colors.green}1.${colors.reset} All logs
  ${colors.green}2.${colors.reset} Errors only
  ${colors.green}3.${colors.reset} Warnings only
    `);
  
  const filterChoice = await askQuestion("Filter: ");
  let filter = "all";
  if (filterChoice.trim() === "2") filter = "errors";
  else if (filterChoice.trim() === "3") filter = "warnings";
  
  const followChoice = await askQuestion("Follow logs (live updates)? (y/n): ");
  const follow = followChoice.trim().toLowerCase() === "y" || followChoice.trim().toLowerCase() === "yes";
  
  const linesChoice = await askQuestion("Number of lines to show (default 50): ");
  const lines = parseInt(linesChoice.trim()) || 50;
  
  try {
    const args = [
      "logs",
      `--service=${service}`,
      `--filter=${filter}`,
      `--lines=${lines}`,
    ];
    if (follow) args.push("--follow");
    
    await execCommand(`node scripts/krapi-manager.js ${args.join(" ")}`);
  } catch (err) {
    error("Failed to view logs");
  }
  
  if (!follow) {
    await askQuestion("\nPress Enter to continue...");
  }
}

/**
 * Configuration menu
 */
async function configMenu() {
  while (true) {
    console.clear();
    title("Configuration");
    
    console.log(`
  ${colors.green}1.${colors.reset} View all configuration
  ${colors.green}2.${colors.reset} Quick Settings
  ${colors.green}3.${colors.reset} Advanced (manual key/value)
  ${colors.green}4.${colors.reset} Reset to defaults
  ${colors.green}5.${colors.reset} Help (show all config keys)
  ${colors.green}0.${colors.reset} Back to main menu
    `);
    
    const choice = await askQuestion("Select option: ");
    
    switch (choice.trim()) {
      case "1":
        await execCommand(`node scripts/krapi-manager.js config list`);
        await askQuestion("\nPress Enter to continue...");
        break;
      case "2":
        await quickSettingsMenu();
        break;
      case "3":
        await advancedConfigMenu();
        break;
      case "4":
        if (await confirm("Reset configuration to defaults?")) {
          await execCommand("node scripts/krapi-manager.js config reset --yes");
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      case "5":
        await showConfigHelp();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "0":
        return;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Quick Settings Menu - Common settings with easy selectors
 */
async function quickSettingsMenu() {
  while (true) {
    console.clear();
    title("Quick Settings");
    
    console.log(`
  ${colors.bright}Frontend:${colors.reset}
  ${colors.green}1.${colors.reset} Frontend Port
  ${colors.green}2.${colors.reset} Frontend Host
  ${colors.green}3.${colors.reset} Frontend URL
  
  ${colors.bright}Backend:${colors.reset}
  ${colors.green}4.${colors.reset} Backend Port
  ${colors.green}5.${colors.reset} Backend Host
  ${colors.green}6.${colors.reset} Backend URL
  
  ${colors.bright}Security:${colors.reset}
  ${colors.green}7.${colors.reset} Allowed Origins (CORS)
  ${colors.green}8.${colors.reset} CORS Enabled
  ${colors.green}9.${colors.reset} Behind Proxy
  ${colors.green}10.${colors.reset} Rate Limiting
  
  ${colors.bright}Environment:${colors.reset}
  ${colors.green}11.${colors.reset} Node Environment (dev/prod)
  
  ${colors.green}0.${colors.reset} Back to config menu
    `);
    
    const choice = await askQuestion("Select setting: ");
    
    switch (choice.trim()) {
      case "1": {
        const current = await getConfigValue("frontend.port");
        info(`Current: ${current}`);
        const value = await askQuestion("Frontend port (default: 3498): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set frontend.port ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "2": {
        const current = await getConfigValue("frontend.host");
        info(`Current: ${current}`);
        console.log("Options: localhost (local only) or 0.0.0.0 (all interfaces)");
        const value = await askQuestion("Frontend host (default: localhost): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set frontend.host ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "3": {
        const current = await getConfigValue("frontend.url");
        info(`Current: ${current}`);
        const value = await askQuestion("Frontend URL (e.g., http://localhost:3498): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set frontend.url ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "4": {
        const current = await getConfigValue("backend.port");
        info(`Current: ${current}`);
        const value = await askQuestion("Backend port (default: 3470): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set backend.port ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "5": {
        const current = await getConfigValue("backend.host");
        info(`Current: ${current}`);
        console.log("Options: localhost (local only) or 0.0.0.0 (all interfaces)");
        const value = await askQuestion("Backend host (default: localhost): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set backend.host ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "6": {
        const current = await getConfigValue("backend.url");
        info(`Current: ${current}`);
        const value = await askQuestion("Backend URL (e.g., http://localhost:3470): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set backend.url ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "7": {
        const current = await getConfigValue("security.allowedOrigins");
        info(`Current: ${current}`);
        console.log("Enter comma-separated origins (e.g., https://app1.com,https://app2.com)");
        console.log("Note: localhost origins are always automatically included");
        const value = await askQuestion("Allowed origins: ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js security set-allowed-origins ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "8": {
        const current = await getConfigValue("security.enableCors");
        info(`Current: ${current}`);
        const value = await askQuestion("Enable CORS? (true/false): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set security.enableCors ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "9": {
        const current = await getConfigValue("security.behindProxy");
        info(`Current: ${current}`);
        const value = await askQuestion("Behind proxy? (true/false): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set security.behindProxy ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "10": {
        const current = await getConfigValue("security.rateLimit.enabled");
        info(`Current: ${current}`);
        const value = await askQuestion("Enable rate limiting? (true/false): ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set security.rateLimit.enabled ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "11": {
        const current = await getConfigValue("app.nodeEnv");
        info(`Current: ${current}`);
        console.log("Options: development or production");
        const value = await askQuestion("Node environment: ");
        if (value.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set app.nodeEnv ${value.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "0":
        return;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Advanced config menu - manual key/value entry
 */
async function advancedConfigMenu() {
  while (true) {
    console.clear();
    title("Advanced Configuration");
    
    console.log(`
  ${colors.green}1.${colors.reset} Get config value
  ${colors.green}2.${colors.reset} Set config value
  ${colors.green}0.${colors.reset} Back to config menu
    `);
    
    const choice = await askQuestion("Select option: ");
    
    switch (choice.trim()) {
      case "1": {
        console.log("\nEnter config key (e.g., frontend.port, security.allowedOrigins)");
        console.log("Type 'help' to see all available keys");
        const key = await askQuestion("Config key: ");
        if (key.trim().toLowerCase() === "help") {
          await showConfigHelp();
        } else if (key.trim()) {
          await execCommand(`node scripts/krapi-manager.js config get ${key.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "2": {
        console.log("\nEnter config key and value");
        console.log("Type 'help' to see all available keys");
        const setKey = await askQuestion("Config key: ");
        if (setKey.trim().toLowerCase() === "help") {
          await showConfigHelp();
          await askQuestion("\nPress Enter to continue...");
          continue;
        }
        const setVal = await askQuestion("Config value: ");
        if (setKey.trim() && setVal.trim()) {
          await execCommand(`node scripts/krapi-manager.js config set ${setKey.trim()} ${setVal.trim()}`);
        }
        await askQuestion("\nPress Enter to continue...");
        break;
      }
      case "0":
        return;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Show config help - list all available config keys
 */
async function showConfigHelp() {
  console.clear();
  title("Configuration Keys Help");
  
  console.log(`
${colors.bright}Available Configuration Keys:${colors.reset}

${colors.bright}Application:${colors.reset}
  app.name              - Application name
  app.nodeEnv           - Node environment (development/production)

${colors.bright}Frontend:${colors.reset}
  frontend.url          - Frontend URL (e.g., http://localhost:3498)
  frontend.port         - Frontend port (default: 3498)
  frontend.host         - Frontend host (localhost or 0.0.0.0)

${colors.bright}Backend:${colors.reset}
  backend.url           - Backend URL (e.g., http://localhost:3470)
  backend.port         - Backend port (default: 3470)
  backend.host          - Backend host (localhost or 0.0.0.0)

${colors.bright}Security:${colors.reset}
  security.allowedOrigins      - Array of allowed CORS origins
  security.enableCors          - Enable CORS (true/false)
  security.behindProxy         - Behind reverse proxy (true/false)
  security.rateLimit.enabled   - Enable rate limiting (true/false)
  security.rateLimit.windowMs  - Rate limit window in milliseconds
  security.rateLimit.loginMax  - Max login attempts per window
  security.rateLimit.sensitiveMax - Max sensitive operations per window
  security.rateLimit.generalMax - Max general requests per window

${colors.bright}Database:${colors.reset}
  database.path         - Database file path
  database.projectsDir  - Projects directory path

${colors.bright}Examples:${colors.reset}
  Get value:  config get frontend.port
  Set value:   config set frontend.port 8080
  Set array:   config set security.allowedOrigins [https://app1.com,https://app2.com]
  Set boolean: config set security.enableCors true
  `);
}

/**
 * Get config value helper
 */
async function getConfigValue(key) {
  try {
    const { stdout } = await execCommand(`node scripts/krapi-manager.js config get ${key}`, rootDir, true, false);
    return stdout.trim();
  } catch {
    return "N/A";
  }
}

/**
 * Development mode menu
 */
async function developmentMenu() {
  while (true) {
    console.clear();
    title("Development Mode");
    
    console.log(`
  ${colors.green}1.${colors.reset} Start in Development Mode (with hot reload)
  ${colors.green}2.${colors.reset} Quick Rebuild + Start Dev Mode
  ${colors.green}0.${colors.reset} Back to main menu
    `);
    
    const choice = await askQuestion("Select option: ");
    
    switch (choice.trim()) {
      case "1":
        await startServices("dev");
        break;
      case "2":
        info("Rebuilding packages...");
        await execCommand("npm run build:packages", rootDir, false, false);
        info("Starting in development mode...");
        await startServices("dev");
        break;
      case "0":
        return;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Reset app state - deletes database and rebuilds packages/services
 */
async function resetAppState() {
  console.clear();
  title("⚠️  Reset App State");
  
  warn("This will delete all database data and rebuild packages!");
  warn("Your configuration (.env files) will be preserved.");
  warn("Dependencies (node_modules) will NOT be deleted.");
  
  const confirmText = await askQuestion("\nType 'RESET' to confirm: ");
  
  if (confirmText.trim() !== "RESET") {
    info("Reset cancelled.");
    await askQuestion("\nPress Enter to continue...");
    return;
  }
  
  try {
    // Delete database files
    title("Deleting databases...");
    
    // Databases are now always stored in backend-server/data (not root/data)
    const backendDataDir = path.join(rootDir, "backend-server", "data");
    
    let deletedMainDb = false;
    let deletedProjectsCount = 0;
    
    if (fs.existsSync(backendDataDir)) {
      const mainDb = path.join(backendDataDir, "krapi.db");
      const projectsDir = path.join(backendDataDir, "projects");
      
      if (fs.existsSync(mainDb)) {
        fs.unlinkSync(mainDb);
        deletedMainDb = true;
        success("Deleted main database");
      }
      
      if (fs.existsSync(projectsDir)) {
        const projectFiles = fs.readdirSync(projectsDir);
        projectFiles.forEach((file) => {
          if (file.endsWith(".db")) {
            fs.unlinkSync(path.join(projectsDir, file));
            deletedProjectsCount++;
          }
        });
      }
      
      // Also delete WAL and SHM files if they exist
      if (fs.existsSync(mainDb + "-wal")) {
        fs.unlinkSync(mainDb + "-wal");
      }
      if (fs.existsSync(mainDb + "-shm")) {
        fs.unlinkSync(mainDb + "-shm");
      }
    }
    
    if (deletedProjectsCount > 0) {
      success(`Deleted ${deletedProjectsCount} project database(s)`);
    }
    
    if (!deletedMainDb && deletedProjectsCount === 0) {
      warn("No database files found to delete");
    }
    
    // Rebuild packages
    title("Rebuilding packages...");
    await execCommand("npm run build:packages", rootDir, false, false);
    success("Packages rebuilt!");
    
    // Rebuild services
    title("Rebuilding services...");
    await execCommand("npm run build:backend", rootDir, false, false);
    await execCommand("npm run build:frontend", rootDir, false, false);
    success("Services rebuilt!");
    
    title("✅ Reset Complete!");
    success("App state has been reset.");
    info("Database files deleted and packages/services rebuilt.");
    info("Configuration files (.env) were preserved.");
    
    const startNow = await confirm("\nStart KRAPI now?");
    if (startNow) {
      await smartStartup(false);
    } else {
      await askQuestion("\nPress Enter to continue...");
    }
  } catch (err) {
    error(`Reset failed: ${err.message}`);
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    await askQuestion("\nPress Enter to continue...");
  }
}

/**
 * Clean test projects - removes projects created by tests
 */
async function cleanTestProjects() {
  console.clear();
  title("🧹 Clean Test Projects");
  
  info("This will delete all test projects (projects with 'TEST_' prefix or 'Test project' in description).");
  info("Your real projects will be preserved.");
  
  const confirm = await askQuestion("\nContinue? (y/N): ");
  
  if (confirm.trim().toLowerCase() !== "y") {
    info("Cleanup cancelled.");
    await askQuestion("\nPress Enter to continue...");
    return;
  }
  
  try {
    // Check if services are running
    const status = await checkStatus(true);
    if (!status.backendRunning) {
      error("Backend is not running. Please start KRAPI first (option 1).");
      await askQuestion("\nPress Enter to continue...");
      return;
    }
    
    // Load config to get backend URL
    let backendUrl = "http://localhost:3470";
    try {
      const configPath = path.join(rootDir, "config", "krapi-config.json");
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configContent);
        if (config.backend && config.backend.url) {
          backendUrl = config.backend.url;
        }
      }
    } catch (err) {
      // Use default
    }
    
    info("Connecting to backend...");
    
    // Login as admin
    const loginResponse = await new Promise((resolve, reject) => {
      const http = require("http");
      const url = require("url");
      const parsedUrl = new url.URL(`${backendUrl}/krapi/k1/auth/admin/login`);
      
      const postData = JSON.stringify({
        username: "admin",
        password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
      });
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };
      
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });
      
      req.on("error", reject);
      req.write(postData);
      req.end();
    });
    
    if (!loginResponse.success || !loginResponse.data?.session_token) {
      error("Failed to login as admin. Please check your credentials.");
      await askQuestion("\nPress Enter to continue...");
      return;
    }
    
    const sessionToken = loginResponse.data.session_token;
    info("✓ Logged in as admin");
    
    // Get all projects
    info("Fetching projects...");
    const projectsResponse = await new Promise((resolve, reject) => {
      const http = require("http");
      const url = require("url");
      const parsedUrl = new url.URL(`${backendUrl}/krapi/k1/projects`);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
        },
      };
      
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });
      
      req.on("error", reject);
      req.end();
    });
    
    if (!projectsResponse.success || !Array.isArray(projectsResponse.data)) {
      error("Failed to fetch projects.");
      await askQuestion("\nPress Enter to continue...");
      return;
    }
    
    const projects = projectsResponse.data;
    
    // Identify test projects
    const testProjects = projects.filter((project) => {
      const name = project.name || "";
      const description = project.description || "";
      return (
        name.startsWith("TEST_") ||
        name.includes("Test Project") ||
        description.includes("Test project") ||
        description.includes("test project")
      );
    });
    
    if (testProjects.length === 0) {
      success("No test projects found. Nothing to clean!");
      await askQuestion("\nPress Enter to continue...");
      return;
    }
    
    info(`Found ${testProjects.length} test project(s) to delete:`);
    testProjects.forEach((p) => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    
    // Delete each test project
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const project of testProjects) {
      try {
        await new Promise((resolve, reject) => {
          const http = require("http");
          const url = require("url");
          const parsedUrl = new url.URL(`${backendUrl}/krapi/k1/projects/${project.id}`);
          
          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${sessionToken}`,
            },
          };
          
          const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(data);
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
            });
          });
          
          req.on("error", reject);
          req.end();
        });
        
        deletedCount++;
        console.log(`   ✓ Deleted: ${project.name}`);
      } catch (err) {
        failedCount++;
        console.log(`   ✗ Failed to delete ${project.name}: ${err.message}`);
      }
    }
    
    console.log("");
    if (deletedCount > 0) {
      success(`Deleted ${deletedCount} test project(s)!`);
    }
    if (failedCount > 0) {
      warn(`Failed to delete ${failedCount} project(s).`);
    }
    
    await askQuestion("\nPress Enter to continue...");
  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    await askQuestion("\nPress Enter to continue...");
  }
}

/**
 * Restart services
 */
async function restartServices(mode = "prod") {
  await stopServices();
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds for ports to be released
  if (mode === "dev") {
    await startServices("dev", false);
  } else {
    await smartStartup(false);
  }
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  // Main loop
  while (true) {
    showMainMenu();
    const choice = await askQuestion("Select an option: ");
    
    switch (choice.trim()) {
      case "1":
        await smartStartup(false);
        break;
      case "2":
        await stopServices();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "3":
        const restartMode = await askQuestion("Mode (dev/prod) [prod]: ");
        await restartServices(restartMode.trim() || "prod");
        break;
      case "4":
        await checkStatus();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "5":
        await viewLogs();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "6":
        await configMenu();
        break;
      case "7":
        await advancedMenu();
        break;
      case "8":
        await resetAppState();
        break;
      case "9":
        await cleanTestProjects();
        break;
      case "0":
        console.log("\n👋 Goodbye!");
        if (rl) rl.close();
        process.exit(0);
        break;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Advanced options menu
 */
async function advancedMenu() {
  while (true) {
    console.clear();
    title("Advanced Options");
    
    console.log(`
  ${colors.green}1.${colors.reset} Development Mode
  ${colors.green}2.${colors.reset} Run Setup Again (full install/build)
  ${colors.green}0.${colors.reset} Back to main menu
    `);
    
    const choice = await askQuestion("Select option: ");
    
    switch (choice.trim()) {
      case "1":
        await developmentMenu();
        break;
      case "2":
        await firstTimeSetup();
        break;
      case "0":
        return;
      default:
        warn("Invalid option");
        await askQuestion("\nPress Enter to continue...");
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Check for non-interactive flags
  const nonInteractive = args.includes("--non-interactive") || args.includes("--headless") || args.includes("-y");
  const autoStart = args.includes("--start") || args.includes("--auto-start");
  
  // If --start or --auto-start flag, start directly
  if (autoStart) {
    await smartStartup(nonInteractive);
    return;
  }
  
  // If no arguments, start interactive mode
  if (args.length === 0) {
    await interactiveMode();
    return;
  }
  
  // CLI mode - delegate to krapi-manager
  const { spawn } = require("child_process");
  const scriptPath = path.resolve(rootDir, "scripts", "krapi-manager.js");
  const child = spawn("node", [scriptPath, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false, // Don't use shell - this handles paths with spaces correctly
  });
  
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    error(`Fatal error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
}

module.exports = { main };

