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
  
  // Create .logs directory if it doesn't exist
  const logsDir = path.join(rootDir, ".logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create log file paths with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backendLogPath = path.join(logsDir, `backend-${timestamp}.log`);
  const frontendLogPath = path.join(logsDir, `frontend-${timestamp}.log`);
  
  // Create write streams for log files
  const backendLogStream = fs.createWriteStream(backendLogPath, { flags: "a" });
  const frontendLogStream = fs.createWriteStream(frontendLogPath, { flags: "a" });
  
  info(`Backend logs: ${backendLogPath}`);
  info(`Frontend logs: ${frontendLogPath}`);
  
  // Start backend and frontend separately to capture their logs
  const config = utils.loadConfig();
  
  // Start backend
  const backendCommand = mode === "dev" ? "dev:backend" : "start:backend";
  const backendProcess = spawn("npm", ["run", backendCommand], {
    cwd: rootDir,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  
  // Pipe backend stdout and stderr to log file and console
  backendProcess.stdout.on("data", (data) => {
    const output = data.toString();
    backendLogStream.write(`[${new Date().toISOString()}] ${output}`);
    process.stdout.write(`[Backend] ${output}`);
  });
  
  backendProcess.stderr.on("data", (data) => {
    const output = data.toString();
    backendLogStream.write(`[${new Date().toISOString()}] ${output}`);
    process.stderr.write(`[Backend] ${output}`);
  });
  
  // Start frontend
  const frontendCommand = mode === "dev" ? "dev:frontend" : "start:frontend";
  const frontendProcess = spawn("npm", ["run", frontendCommand], {
    cwd: rootDir,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  
  // Pipe frontend stdout and stderr to log file and console
  frontendProcess.stdout.on("data", (data) => {
    const output = data.toString();
    frontendLogStream.write(`[${new Date().toISOString()}] ${output}`);
    process.stdout.write(`[Frontend] ${output}`);
  });
  
  frontendProcess.stderr.on("data", (data) => {
    const output = data.toString();
    frontendLogStream.write(`[${new Date().toISOString()}] ${output}`);
    process.stderr.write(`[Frontend] ${output}`);
  });
  
  // Store processes for cleanup
  global.backendProcess = backendProcess;
  global.frontendProcess = frontendProcess;
  global.backendLogStream = backendLogStream;
  global.frontendLogStream = frontendLogStream;
  
  // Handle graceful shutdown
  const shutdown = () => {
    info("\n🛑 Shutting down services...");
    if (backendProcess) {
      backendProcess.kill("SIGINT");
    }
    if (frontendProcess) {
      frontendProcess.kill("SIGINT");
    }
    // Close log streams
    if (backendLogStream) {
      backendLogStream.end();
    }
    if (frontendLogStream) {
      frontendLogStream.end();
    }
    process.exit(0);
  };
  
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  
  // Handle process exits
  backendProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      error(`Backend exited with code ${code}`);
    }
    backendLogStream.end();
  });
  
  frontendProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      error(`Frontend exited with code ${code}`);
    }
    frontendLogStream.end();
  });
  
  // Wait for services to be ready
  info("Waiting for services to start...");
  let backendReady = false;
  let frontendReady = false;
  let allServicesReady = false;
  
  const checkBackend = setInterval(async () => {
    if (!backendReady && await isPortInUse(backendPort)) {
      backendReady = true;
      success(`Backend is ready on port ${backendPort}`);
      clearInterval(checkBackend);
      if (backendReady && frontendReady && !allServicesReady) {
        allServicesReady = true;
        success("All services are ready!");
      }
    }
  }, 1000);
  
  const checkFrontend = setInterval(async () => {
    if (!frontendReady && await isPortInUse(frontendPort)) {
      frontendReady = true;
      success(`Frontend is ready on port ${frontendPort}`);
      clearInterval(checkFrontend);
      if (backendReady && frontendReady && !allServicesReady) {
        allServicesReady = true;
        success("All services are ready!");
      }
    }
  }, 1000);
  
  // Timeout after 60 seconds - only warn if services are actually not ready
  setTimeout(() => {
    clearInterval(checkBackend);
    clearInterval(checkFrontend);
    
    // Final check - services might have started but the intervals didn't catch it
    Promise.all([
      isPortInUse(backendPort),
      isPortInUse(frontendPort)
    ]).then(([backendUp, frontendUp]) => {
      if (!backendUp || !frontendUp) {
        const missing = [];
        if (!backendUp) missing.push("Backend");
        if (!frontendUp) missing.push("Frontend");
        warn(`${missing.join(" and ")} ${missing.length === 1 ? "has" : "have"} not started. Check logs for details.`);
      } else if (!allServicesReady) {
        // Services are up but we didn't catch them in time - this is fine
        info("All services are running (startup check completed)");
      }
    }).catch(() => {
      // If port check fails, assume services might still be starting
      if (!backendReady || !frontendReady) {
        info("Service startup check timed out. Services may still be initializing. Check logs if issues persist.");
      }
    });
  }, 60000);
}

/**
 * Stop services
 */
async function stopServices() {
  info("Stopping KRAPI services...");
  
  // Close log streams if they exist
  if (global.backendLogStream) {
    global.backendLogStream.end();
    global.backendLogStream = null;
  }
  if (global.frontendLogStream) {
    global.frontendLogStream.end();
    global.frontendLogStream = null;
  }
  
  // Kill processes if they exist
  if (global.backendProcess) {
    global.backendProcess.kill("SIGTERM");
    global.backendProcess = null;
  }
  if (global.frontendProcess) {
    global.frontendProcess.kill("SIGTERM");
    global.frontendProcess = null;
  }
  
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
/**
 * Color codes for log levels
 */
function colorizeLogLine(line) {
  if (!line || line.trim() === "") return line;
  
  // Error patterns
  if (/\b(error|ERROR|Error|failed|FAILED|Failed|exception|EXCEPTION|Exception|fatal|FATAL|Fatal)\b/i.test(line)) {
    return `\x1b[31m${line}\x1b[0m`; // Red
  }
  
  // Warning patterns
  if (/\b(warn|WARN|Warn|warning|WARNING|Warning|deprecated|DEPRECATED|Deprecated)\b/i.test(line)) {
    return `\x1b[33m${line}\x1b[0m`; // Yellow
  }
  
  // Info patterns
  if (/\b(info|INFO|Info|started|STARTED|Started|listening|LISTENING|Listening|connected|CONNECTED|Connected)\b/i.test(line)) {
    return `\x1b[36m${line}\x1b[0m`; // Cyan
  }
  
  // Success patterns
  if (/\b(success|SUCCESS|Success|completed|COMPLETED|Completed|ready|READY|Ready)\b/i.test(line)) {
    return `\x1b[32m${line}\x1b[0m`; // Green
  }
  
  return line;
}

/**
 * Filter log lines based on level
 */
function filterLogLines(lines, filter) {
  if (filter === "all") return lines;
  
  return lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    if (filter === "errors") {
      return /\b(error|failed|exception|fatal)\b/.test(lowerLine);
    }
    if (filter === "warnings") {
      return /\b(warn|warning|deprecated)\b/.test(lowerLine);
    }
    return true;
  });
}

/**
 * Find log files for a service
 */
function findLogFiles(service) {
  const logFiles = [];
  
  // Check .logs directory (created by krapi-manager)
  const logsDir = path.join(rootDir, ".logs");
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir)
      .filter((f) => f.endsWith(".log"))
      .filter((f) => {
        if (service === "frontend") return f.startsWith("frontend-");
        if (service === "backend") return f.startsWith("backend-");
        return true; // both
      })
      .map((f) => ({
        path: path.join(logsDir, f),
        name: f,
        service: f.startsWith("frontend-") ? "frontend" : "backend",
        mtime: fs.statSync(path.join(logsDir, f)).mtime,
      }));
    logFiles.push(...files);
  }
  
  // Check backend-server/logs directory (backend logger)
  if (service === "backend" || service === "both") {
    const backendLogDir = path.join(rootDir, "backend-server", "logs");
    if (fs.existsSync(backendLogDir)) {
      const files = fs.readdirSync(backendLogDir)
        .filter((f) => f.endsWith(".log"))
        .map((f) => ({
          path: path.join(backendLogDir, f),
          name: f,
          service: "backend",
          mtime: fs.statSync(path.join(backendLogDir, f)).mtime,
        }));
      logFiles.push(...files);
    }
  }
  
  // Sort by modification time (newest first)
  return logFiles.sort((a, b) => b.mtime - a.mtime);
}

async function showLogs(follow = false, service = "both", filter = "all", lines = 50) {
  const logFiles = findLogFiles(service);
  
  if (logFiles.length === 0) {
    warn("No log files found");
    info(`Checked directories:`);
    info(`  - ${path.join(rootDir, ".logs")}`);
    if (service === "backend" || service === "both") {
      info(`  - ${path.join(rootDir, "backend-server", "logs")}`);
    }
    return;
  }
  
  // Show available log files
  console.log("\n📋 Available log files:");
  logFiles.slice(0, 10).forEach((file, idx) => {
    const size = (fs.statSync(file.path).size / 1024).toFixed(2);
    const date = file.mtime.toLocaleString();
    console.log(`  ${idx + 1}. [${file.service}] ${file.name} (${size} KB, ${date})`);
  });
  console.log();
  
  if (follow) {
    // For follow mode, use platform-specific tail commands
    const latestFiles = service === "both" 
      ? [
          logFiles.find((f) => f.service === "frontend"),
          logFiles.find((f) => f.service === "backend"),
        ].filter(Boolean)
      : [logFiles[0]];
    
    if (latestFiles.length === 0) {
      warn("No log files to follow");
      return;
    }
    
    info(`Following ${latestFiles.length} log file(s) (filter: ${filter})...`);
    info("Press Ctrl+C to stop\n");
    
    // Use tail command for following
    if (latestFiles.length === 1) {
      // Single file - use tail directly
      const file = latestFiles[0];
      const tailCmd = process.platform === "win32" 
        ? ["powershell", ["-Command", `Get-Content -Path "${file.path}" -Wait -Tail ${lines}`]]
        : ["tail", ["-f", "-n", lines.toString(), file.path]];
      
      const tail = spawn(tailCmd[0], tailCmd[1], { stdio: "pipe" });
      
      tail.stdout.on("data", (data) => {
        const logLines = data.toString().split("\n");
        logLines.forEach((line) => {
          if (line.trim()) {
            const filtered = filterLogLines([line], filter);
            if (filtered.length > 0) {
              const prefix = `[${file.service.toUpperCase()}] `;
              console.log(colorizeLogLine(prefix + filtered[0]));
            }
          }
        });
      });
      
      tail.stderr.on("data", (data) => {
        process.stderr.write(data);
      });
      
      process.on("SIGINT", () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      // Multiple files - show each with prefix
      const tails = latestFiles.map((file) => {
        const tailCmd = process.platform === "win32"
          ? ["powershell", ["-Command", `Get-Content -Path "${file.path}" -Wait -Tail ${lines}`]]
          : ["tail", ["-f", "-n", lines.toString(), file.path]];
        
        const tail = spawn(tailCmd[0], tailCmd[1], { stdio: "pipe" });
        
        tail.stdout.on("data", (data) => {
          const lines = data.toString().split("\n");
          lines.forEach((line) => {
            if (line.trim()) {
              const filtered = filterLogLines([line], filter);
              if (filtered.length > 0) {
                const prefix = `[${file.service.toUpperCase()}] `;
                console.log(colorizeLogLine(prefix + filtered[0]));
              }
            }
          });
        });
        
        tail.stderr.on("data", (data) => {
          process.stderr.write(data);
        });
        
        return tail;
      });
      
      process.on("SIGINT", () => {
        tails.forEach((tail) => tail.kill());
        process.exit(0);
      });
    }
  } else {
    // Show last N lines from latest file(s)
    const latestFiles = service === "both"
      ? [
          logFiles.find((f) => f.service === "frontend"),
          logFiles.find((f) => f.service === "backend"),
        ].filter(Boolean)
      : [logFiles[0]];
    
    latestFiles.forEach((file) => {
      try {
        info(`\n📄 [${file.service.toUpperCase()}] ${file.name}`);
        const content = fs.readFileSync(file.path, "utf8");
        const allLines = content.split("\n").filter((l) => l.trim());
        const filtered = filterLogLines(allLines, filter);
        const lastLines = filtered.slice(-lines);
        
        lastLines.forEach((line) => {
          console.log(colorizeLogLine(line));
        });
        
        if (filtered.length === 0 && filter !== "all") {
          warn(`  No ${filter} found in this log file`);
        }
      } catch (err) {
        error(`Error reading ${file.name}: ${err.message}`);
      }
    });
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
      
    case "set-rate-limit":
      if (!args[1] || !args[2]) {
        error("Usage: security set-rate-limit <setting> <value>");
        console.log("Settings: enabled, login-max, sensitive-max, general-max, window-ms");
        return;
      }
      const setting = args[1];
      const value = args[2];
      
      const config = utils.loadConfig();
      if (!config.security.rateLimit) {
        config.security.rateLimit = {
          enabled: true,
          windowMs: 900000,
          loginMax: 50,
          sensitiveMax: 10,
          generalMax: 1000,
        };
      }
      
      switch (setting) {
        case "enabled":
          config.security.rateLimit.enabled = value === "true";
          utils.saveConfig(config);
          utils.syncConfigToEnv(config);
          success(`Rate limiting ${config.security.rateLimit.enabled ? "enabled" : "disabled"}`);
          break;
        case "login-max":
          const loginMax = parseInt(value);
          if (isNaN(loginMax)) {
            error("Value must be a number");
            return;
          }
          config.security.rateLimit.loginMax = loginMax;
          utils.saveConfig(config);
          utils.syncConfigToEnv(config);
          success(`Login rate limit set to ${loginMax} attempts per window`);
          break;
        case "sensitive-max":
          const sensitiveMax = parseInt(value);
          if (isNaN(sensitiveMax)) {
            error("Value must be a number");
            return;
          }
          config.security.rateLimit.sensitiveMax = sensitiveMax;
          utils.saveConfig(config);
          utils.syncConfigToEnv(config);
          success(`Sensitive operations rate limit set to ${sensitiveMax} attempts per window`);
          break;
        case "general-max":
          const generalMax = parseInt(value);
          if (isNaN(generalMax)) {
            error("Value must be a number");
            return;
          }
          config.security.rateLimit.generalMax = generalMax;
          utils.saveConfig(config);
          utils.syncConfigToEnv(config);
          success(`General rate limit set to ${generalMax} requests per window`);
          break;
        case "window-ms":
          const windowMs = parseInt(value);
          if (isNaN(windowMs)) {
            error("Value must be a number (milliseconds)");
            return;
          }
          config.security.rateLimit.windowMs = windowMs;
          utils.saveConfig(config);
          utils.syncConfigToEnv(config);
          success(`Rate limit window set to ${windowMs}ms (${windowMs / 1000 / 60} minutes)`);
          break;
        default:
          error(`Unknown rate limit setting: ${setting}`);
          console.log("Available settings: enabled, login-max, sensitive-max, general-max, window-ms");
      }
      break;
      
    case "show":
      const showConfig = utils.loadConfig();
      // Get actual allowed origins (includes localhost)
      const actualOrigins = utils.ensureLocalhostInOrigins(showConfig.security.allowedOrigins || []);
      console.log("Security Configuration:");
      console.log(`  CORS Enabled: ${showConfig.security.enableCors}`);
      console.log(`  Behind Proxy: ${showConfig.security.behindProxy}`);
      console.log(`  Allowed Origins: ${actualOrigins.length > 0 ? actualOrigins.join(", ") : "None (all allowed)"}`);
      console.log(`  Note: localhost origins are always allowed`);
      console.log(`  Frontend URL: ${showConfig.frontend.url}`);
      if (showConfig.security.rateLimit) {
        const rl = showConfig.security.rateLimit;
        console.log(`  Rate Limiting: ${rl.enabled ? "Enabled" : "Disabled"}`);
        if (rl.enabled) {
          console.log(`    Window: ${rl.windowMs / 1000 / 60} minutes`);
          console.log(`    Login: ${rl.loginMax} attempts per window`);
          console.log(`    Sensitive: ${rl.sensitiveMax} attempts per window`);
          console.log(`    General: ${rl.generalMax} requests per window`);
        }
      }
      break;
      
    case "reset":
      const defaultConfig = utils.DEFAULT_CONFIG;
      const currentConfig = utils.loadConfig();
      
      // Reset security settings to defaults
      currentConfig.security.allowedOrigins = defaultConfig.security.allowedOrigins;
      currentConfig.security.behindProxy = defaultConfig.security.behindProxy;
      currentConfig.security.enableCors = defaultConfig.security.enableCors;
      currentConfig.security.rateLimit = { ...defaultConfig.security.rateLimit };
      
      utils.saveConfig(currentConfig);
      utils.syncConfigToEnv(currentConfig);
      success("Security settings reset to defaults");
      break;
      
    default:
      error(`Unknown security command: ${subcommand}`);
      console.log("Available commands: set-allowed-origins, set-frontend-url, set-rate-limit, show, reset");
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
  security set-rate-limit <setting> <val> Set rate limit (enabled, login-max, sensitive-max, general-max, window-ms)
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
        let service = "both";
        let filter = "all";
        let lines = 50;
        
        // Parse --service argument
        const serviceArg = args.find((a) => a.startsWith("--service="));
        if (serviceArg) {
          service = serviceArg.split("=")[1] || "both";
        }
        
        // Parse --filter argument
        const filterArg = args.find((a) => a.startsWith("--filter="));
        if (filterArg) {
          filter = filterArg.split("=")[1] || "all";
        }
        
        // Parse --lines argument
        const linesArg = args.find((a) => a.startsWith("--lines="));
        if (linesArg) {
          lines = parseInt(linesArg.split("=")[1]) || 50;
        }
        
        await showLogs(follow, service, filter, lines);
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

