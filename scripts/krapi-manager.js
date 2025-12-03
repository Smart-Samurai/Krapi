#!/usr/bin/env node
/**
 * KRAPI Centralized Management Script
 * 
 * Cross-platform management tool for KRAPI application.
 * Supports both CLI and interactive modes.
 */

const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const utils = require("./krapi-manager-utils");

const rootDir = utils.rootDir;
let rl = null;

/**
 * Colors for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
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

/**
 * Execute command and return promise
 */
function execCommand(command, cwd = rootDir) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Check if process is running on a port
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} || true`;
    
    exec(command, (error, stdout) => {
      resolve(stdout && stdout.trim().length > 0);
    });
  });
}

/**
 * Get process ID from port (Unix/Mac)
 */
function getPidFromPort(port) {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const match = stdout.match(/\s+(\d+)\s*$/);
          resolve(match ? match[1] : null);
        } else {
          resolve(null);
        }
      });
    } else {
      exec(`lsof -ti :${port}`, (error, stdout) => {
        resolve(stdout ? stdout.trim() : null);
      });
    }
  });
}

/**
 * Kill process by PID
 */
function killProcess(pid) {
  return new Promise((resolve) => {
    const command = process.platform === "win32"
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;
    
    exec(command, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Start services
 */
async function startServices(mode = "dev") {
  info(`Starting KRAPI in ${mode} mode...`);
  
  // Check if services are already running
  const frontendPort = utils.getConfigValue("frontend.port");
  const backendPort = utils.getConfigValue("backend.port");
  
  const frontendRunning = await isPortInUse(frontendPort);
  const backendRunning = await isPortInUse(backendPort);
  
  if (frontendRunning || backendRunning) {
    warn("Services appear to be running. Use 'stop' command first or 'restart' to restart.");
    if (frontendRunning) warn(`Frontend port ${frontendPort} is in use`);
    if (backendRunning) warn(`Backend port ${backendPort} is in use`);
    return;
  }
  
  // Initialize environment if needed
  try {
    await execCommand("npm run init-env");
  } catch (err) {
    warn("Environment initialization skipped or failed");
  }
  
  // Start services
  const command = mode === "dev" ? "npm run dev:all" : "npm run start:all";
  const child = spawn("npm", ["run", mode === "dev" ? "dev:all" : "start:all"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
  });
  
  // Handle graceful shutdown
  process.on("SIGINT", () => {
    info("\n🛑 Shutting down services...");
    child.kill("SIGINT");
    process.exit(0);
  });
  
  process.on("SIGTERM", () => {
    info("\n🛑 Shutting down services...");
    child.kill("SIGTERM");
    process.exit(0);
  });
  
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      error(`Services exited with code ${code}`);
    }
    process.exit(code || 0);
  });
}

/**
 * Stop services
 */
async function stopServices() {
  info("Stopping KRAPI services...");
  
  const frontendPort = utils.getConfigValue("frontend.port");
  const backendPort = utils.getConfigValue("backend.port");
  
  let stopped = false;
  
  // Try to stop frontend
  const frontendPid = await getPidFromPort(frontendPort);
  if (frontendPid) {
    info(`Stopping frontend (PID: ${frontendPid})...`);
    await killProcess(frontendPid);
    stopped = true;
  }
  
  // Try to stop backend
  const backendPid = await getPidFromPort(backendPort);
  if (backendPid) {
    info(`Stopping backend (PID: ${backendPid})...`);
    await killProcess(backendPid);
    stopped = true;
  }
  
  if (!stopped) {
    warn("No services found running on configured ports");
  } else {
    success("Services stopped");
  }
}

/**
 * Show service status
 */
async function showStatus() {
  info("KRAPI Service Status:");
  console.log("");
  
  const config = utils.loadConfig();
  const frontendPort = config.frontend.port;
  const backendPort = config.backend.port;
  
  const frontendRunning = await isPortInUse(frontendPort);
  const backendRunning = await isPortInUse(backendPort);
  
  console.log(`Frontend: ${frontendRunning ? "✅ Running" : "❌ Stopped"}`);
  console.log(`  URL: ${config.frontend.url}`);
  console.log(`  Port: ${frontendPort}`);
  console.log(`  Host: ${config.frontend.host}`);
  console.log("");
  
  console.log(`Backend: ${backendRunning ? "✅ Running" : "❌ Stopped"}`);
  console.log(`  URL: ${config.backend.url}`);
  console.log(`  Port: ${backendPort}`);
  console.log(`  Host: ${config.backend.host}`);
  console.log("");
  
  console.log(`Environment: ${config.app.nodeEnv}`);
  console.log(`Behind Proxy: ${config.security.behindProxy ? "Yes" : "No"}`);
  console.log(`CORS Enabled: ${config.security.enableCors ? "Yes" : "No"}`);
  
  if (config.security.allowedOrigins.length > 0) {
    console.log(`Allowed Origins: ${config.security.allowedOrigins.join(", ")}`);
  }
}

/**
 * Restart services
 */
async function restartServices(mode = "dev") {
  info("Restarting KRAPI services...");
  await stopServices();
  // Wait a bit for ports to be released
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await startServices(mode);
}

/**
 * Show logs
 */
async function showLogs(follow = false) {
  const logDir = path.join(rootDir, "backend-server", "logs");
  if (!fs.existsSync(logDir)) {
    warn("No log directory found");
    return;
  }
  
  const logFiles = fs.readdirSync(logDir).filter((f) => f.endsWith(".log")).sort().reverse();
  if (logFiles.length === 0) {
    warn("No log files found");
    return;
  }
  
  const latestLog = path.join(logDir, logFiles[0]);
  info(`Showing logs from: ${logFiles[0]}`);
  
  if (follow) {
    // Tail the log file
    const tail = spawn(process.platform === "win32" ? "powershell" : "tail", 
      process.platform === "win32" 
        ? ["-Command", `Get-Content -Path "${latestLog}" -Wait -Tail 50`]
        : ["-f", latestLog],
      { stdio: "inherit" }
    );
    
    process.on("SIGINT", () => {
      tail.kill();
      process.exit(0);
    });
  } else {
    // Show last 50 lines
    try {
      const content = fs.readFileSync(latestLog, "utf8");
      const lines = content.split("\n");
      const lastLines = lines.slice(-50).join("\n");
      console.log(lastLines);
    } catch (err) {
      error(`Error reading log file: ${err.message}`);
    }
  }
}

/**
 * Config commands
 */
function handleConfigCommand(args) {
  const subcommand = args[0];
  
  switch (subcommand) {
    case "get":
      if (!args[1]) {
        error("Usage: config get <key>");
        return;
      }
      const value = utils.getConfigValue(args[1]);
      if (value === undefined) {
        error(`Config key '${args[1]}' not found`);
      } else {
        console.log(value);
      }
      break;
      
    case "set":
      if (!args[1] || !args[2]) {
        error("Usage: config set <key> <value>");
        return;
      }
      const key = args[1];
      let valueToSet = args[2];
      
      // Parse value (handle booleans, numbers, arrays)
      if (valueToSet === "true") valueToSet = true;
      else if (valueToSet === "false") valueToSet = false;
      else if (!isNaN(valueToSet) && valueToSet.trim() !== "") valueToSet = Number(valueToSet);
      else if (valueToSet.startsWith("[") && valueToSet.endsWith("]")) {
        valueToSet = valueToSet.slice(1, -1).split(",").map((v) => v.trim());
      }
      
      // Validate based on key
      if (key.includes("url") && typeof valueToSet === "string") {
        if (!utils.validateUrl(valueToSet)) {
          error("Invalid URL format");
          return;
        }
      } else if (key.includes("port")) {
        // Convert to number if it's a string
        const portNum = typeof valueToSet === "string" ? Number(valueToSet) : valueToSet;
        if (isNaN(portNum) || !utils.validatePort(portNum)) {
          error("Invalid port number (must be 1-65535)");
          return;
        }
        // Use the numeric value
        valueToSet = portNum;
      } else if (key.includes("host") && typeof valueToSet === "string") {
        if (!utils.validateHost(valueToSet)) {
          error("Invalid host (use 'localhost' or '0.0.0.0')");
          return;
        }
      }
      
      const { oldValue, newValue } = utils.setConfigValue(key, valueToSet);
      success(`Updated ${key}: ${oldValue} → ${newValue}`);
      info("Configuration synced to .env files");
      break;
      
    case "list":
      const config = utils.loadConfig();
      console.log(utils.formatConfigForDisplay(config));
      break;
      
      case "reset":
        // In CLI mode, require --yes flag for safety
        if (args.includes("--yes") || args.includes("-y")) {
          utils.saveConfig(utils.DEFAULT_CONFIG);
          utils.syncConfigToEnv(utils.DEFAULT_CONFIG);
          success("Configuration reset to defaults");
        } else {
          error("Use --yes flag to confirm reset: config reset --yes");
        }
        break;
      
    default:
      error(`Unknown config command: ${subcommand}`);
      console.log("Available commands: get, set, list, reset");
  }
}

/**
 * Security commands
 */
function handleSecurityCommand(args) {
  const subcommand = args[0];
  
  switch (subcommand) {
    case "set-allowed-origins":
      if (!args[1]) {
        error("Usage: security set-allowed-origins <origin1,origin2,...>");
        return;
      }
      const origins = args[1].split(",").map((o) => o.trim()).filter((o) => o);
      // Validate URLs
      for (const origin of origins) {
        if (!utils.validateUrl(origin) && origin !== "*") {
          error(`Invalid origin URL: ${origin}`);
          return;
        }
      }
      utils.setConfigValue("security.allowedOrigins", origins);
      success(`Set allowed origins: ${origins.join(", ")}`);
      break;
      
    case "set-frontend-url":
      if (!args[1]) {
        error("Usage: security set-frontend-url <url>");
        return;
      }
      if (!utils.validateUrl(args[1])) {
        error("Invalid URL format");
        return;
      }
      utils.setConfigValue("frontend.url", args[1]);
      success(`Set frontend URL: ${args[1]}`);
      break;
      
    case "show":
      const config = utils.loadConfig();
      // Get actual allowed origins (includes localhost)
      const actualOrigins = utils.ensureLocalhostInOrigins(config.security.allowedOrigins || []);
      console.log("Security Configuration:");
      console.log(`  CORS Enabled: ${config.security.enableCors}`);
      console.log(`  Behind Proxy: ${config.security.behindProxy}`);
      console.log(`  Allowed Origins: ${actualOrigins.length > 0 ? actualOrigins.join(", ") : "None (all allowed)"}`);
      console.log(`  Note: localhost origins are always allowed`);
      console.log(`  Frontend URL: ${config.frontend.url}`);
      break;
      
    default:
      error(`Unknown security command: ${subcommand}`);
      console.log("Available commands: set-allowed-origins, set-frontend-url, show");
  }
}

/**
 * Confirm prompt
 */
function confirm(message) {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
KRAPI Management Script

Usage:
  npm run krapi <command> [options]

Commands:
  start [--dev|--prod]    Start services (default: dev)
  stop                    Stop services
  restart [--dev|--prod]  Restart services
  status                  Show service status
  logs [--follow]         Show logs (use --follow to tail)
  
  config get <key>        Get configuration value
  config set <key> <val>  Set configuration value
  config list             List all configuration
  config reset            Reset to defaults
  
  config set frontend.port <port>       Set frontend port (updates URL automatically)
  config set backend.port <port>        Set backend port (updates URL automatically)
  config set frontend.host <host>      Set frontend host (localhost or 0.0.0.0)
  config set backend.host <host>       Set backend host (localhost or 0.0.0.0)
  
  security set-allowed-origins <origins>  Set CORS allowed origins (localhost always included)
  security set-frontend-url <url>        Set frontend URL
  security show                          Show security settings
  
  help                    Show this help

Examples:
  npm run krapi start --dev
  npm run krapi config set frontend.url https://example.com
  npm run krapi config set frontend.port 8080
  npm run krapi config set backend.port 8081
  npm run krapi security set-allowed-origins https://app.example.com,https://api.example.com
  npm run krapi status
  
Note: Changing ports requires restarting services. The SDK supports endpoint changes via reconnect.
`);
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const showMenu = () => {
    console.log(`
╔══════════════════════════════════════╗
║      KRAPI Management Menu          ║
╚══════════════════════════════════════╝

1. Start (Development)
2. Start (Production)
3. Stop
4. Restart (Development)
5. Restart (Production)
6. Status
7. Logs
8. Configuration
9. Security Settings
10. Help
0. Exit

`);
  };
  
  const showConfigMenu = () => {
    console.log(`
Configuration Menu:
1. Get value
2. Set value
3. List all
4. Reset to defaults
5. Back
`);
  };
  
  const showSecurityMenu = () => {
    console.log(`
Security Menu:
1. Set allowed origins
2. Set frontend URL
3. Show settings
4. Back
`);
  };
  
  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };
  
  while (true) {
    showMenu();
    const choice = await askQuestion("Select option: ");
    
    switch (choice.trim()) {
      case "1":
        await startServices("dev");
        break;
      case "2":
        await startServices("prod");
        break;
      case "3":
        await stopServices();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "4":
        await restartServices("dev");
        break;
      case "5":
        await restartServices("prod");
        break;
      case "6":
        await showStatus();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "7":
        const follow = await askQuestion("Follow logs? (y/N): ");
        await showLogs(follow.toLowerCase() === "y");
        await askQuestion("\nPress Enter to continue...");
        break;
      case "8":
        showConfigMenu();
        const configChoice = await askQuestion("Select option: ");
        switch (configChoice.trim()) {
          case "1":
            const getKey = await askQuestion("Config key: ");
            const value = utils.getConfigValue(getKey);
            console.log(value !== undefined ? value : "Key not found");
            await askQuestion("\nPress Enter to continue...");
            break;
          case "2":
            const setKey = await askQuestion("Config key: ");
            const setVal = await askQuestion("Config value: ");
            handleConfigCommand(["set", setKey, setVal]);
            await askQuestion("\nPress Enter to continue...");
            break;
          case "3":
            const config = utils.loadConfig();
            console.log(utils.formatConfigForDisplay(config));
            await askQuestion("\nPress Enter to continue...");
            break;
          case "4":
            if (await confirm("Reset to defaults?")) {
              utils.saveConfig(utils.DEFAULT_CONFIG);
              utils.syncConfigToEnv(utils.DEFAULT_CONFIG);
              success("Configuration reset");
            }
            await askQuestion("\nPress Enter to continue...");
            break;
        }
        break;
      case "9":
        showSecurityMenu();
        const secChoice = await askQuestion("Select option: ");
        switch (secChoice.trim()) {
          case "1":
            const origins = await askQuestion("Allowed origins (comma-separated): ");
            handleSecurityCommand(["set-allowed-origins", origins]);
            await askQuestion("\nPress Enter to continue...");
            break;
          case "2":
            const url = await askQuestion("Frontend URL: ");
            handleSecurityCommand(["set-frontend-url", url]);
            await askQuestion("\nPress Enter to continue...");
            break;
          case "3":
            handleSecurityCommand(["show"]);
            await askQuestion("\nPress Enter to continue...");
            break;
        }
        break;
      case "10":
        showHelp();
        await askQuestion("\nPress Enter to continue...");
        break;
      case "0":
        console.log("\nGoodbye!");
        rl.close();
        process.exit(0);
        break;
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
  
  // If no arguments, start interactive mode
  if (args.length === 0) {
    await interactiveMode();
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case "start":
        const mode = args.includes("--prod") ? "prod" : args.includes("--dev") ? "dev" : "dev";
        await startServices(mode);
        break;
        
      case "stop":
        await stopServices();
        break;
        
      case "restart":
        const restartMode = args.includes("--prod") ? "prod" : args.includes("--dev") ? "dev" : "dev";
        await restartServices(restartMode);
        break;
        
      case "status":
        await showStatus();
        break;
        
      case "logs":
        const follow = args.includes("--follow");
        await showLogs(follow);
        break;
        
      case "config":
        handleConfigCommand(args.slice(1));
        break;
        
      case "security":
        handleSecurityCommand(args.slice(1));
        break;
        
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
        
      default:
        error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    error(`Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    error(`Fatal error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { main };

