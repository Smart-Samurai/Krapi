/**
 * DEPRECATED: This web-based control panel has been replaced
 * with a new Desktop Application Manager.
 * 
 * Please use: StartManager.bat (Windows) or ./StartManager.sh (Linux/Mac)
 * 
 * The new manager provides better functionality:
 * - Native desktop GUI or web interface as fallback
 * - Better process management and dependency checking
 * - Real-time monitoring and comprehensive logging
 */

console.log("=".repeat(60));
console.log("DEPRECATION NOTICE");
console.log("=".repeat(60));
console.log("This web control panel is deprecated.");
console.log("Please use the new Desktop Application Manager:");
console.log("- Windows: StartManager.bat");
console.log("- Linux/Mac: ./StartManager.sh");
console.log("=".repeat(60));
console.log("");

const express = require("express");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Store process references
let apiProcess = null;
let frontendProcess = null;
let logStreams = {
  api: [],
  frontend: [],
  control: [],
};

// WebSocket server for real-time logs
const wss = new WebSocket.Server({ port: 4001 });

// Broadcast to all connected WebSocket clients
function broadcastToClients(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error("Failed to send to client:", error.message);
      }
    }
  });
}

// Log function that also broadcasts via WebSocket
function log(message, type = "info", service = "control") {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type, service };

  console.log(`[${timestamp}] [${service.toUpperCase()}] ${message}`);

  // Store in memory (keep last 100 entries per service)
  if (!logStreams[service]) logStreams[service] = [];
  logStreams[service].push(logEntry);
  if (logStreams[service].length > 100) {
    logStreams[service].shift();
  }

  // Broadcast to WebSocket clients immediately
  broadcastToClients({ type: "log", data: logEntry });
}

// Check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require("net");
    const server = net.createServer();

    server.once("error", () => {
      resolve(true);
    });

    server.once("listening", () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

// Get process info for a port
function getProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }

      const lines = stdout.split("\n");
      for (const line of lines) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          resolve({ port, pid });
          return;
        }
      }
      resolve(null);
    });
  });
}

// Kill process on port
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    exec(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`,
      (error) => {
        resolve(!error);
      }
    );
  });
}

// Read recent logs from file
function readRecentLogs(service, lines = 50) {
  return new Promise((resolve) => {
    const logPath = path.join(__dirname, "..", "..", "logs", `${service}.log`);

    if (!fs.existsSync(logPath)) {
      resolve([]);
      return;
    }

    exec(
      `powershell -command "Get-Content -Tail ${lines} '${logPath}'"`,
      (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }

        const logEntries = stdout
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            return {
              timestamp: new Date().toISOString(),
              message: line,
              type: "info",
              service,
            };
          });

        resolve(logEntries);
      }
    );
  });
}

// Start API server
async function startApiServer() {
  if (apiProcess) {
    log("API server is already running", "warning", "api");
    return false;
  }

  const apiInUse = await isPortInUse(3001);
  if (apiInUse) {
    log("Port 3001 is already in use", "error", "api");
    await killProcessOnPort(3001);
    log("Killed existing process on port 3001", "info", "api");
  }

  log("Starting API server...", "info", "api");

  const apiDir = path.join(__dirname, "..", "..", "api-server");
  apiProcess = spawn("pnpm", ["run", "dev"], {
    cwd: apiDir,
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      JWT_SECRET: "dev-secret-key",
      DB_PATH: "./data/app.db",
      DEFAULT_ADMIN_USERNAME: "admin",
      DEFAULT_ADMIN_PASSWORD: "admin123",
    },
  });

  apiProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(line.trim(), "info", "api");
    });
  });

  apiProcess.stderr.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(line.trim(), "error", "api");
    });
  });

  apiProcess.on("close", (code) => {
    log(
      `API server exited with code ${code}`,
      code === 0 ? "info" : "error",
      "api"
    );
    apiProcess = null;
  });

  apiProcess.on("error", (err) => {
    log(`API server error: ${err.message}`, "error", "api");
    apiProcess = null;
  });

  // Wait a bit and check if it started
  return new Promise((resolve) => {
    setTimeout(async () => {
      const started = await isPortInUse(3001);
      if (started) {
        log("API server started successfully on port 3001", "success", "api");
        resolve(true);
      } else {
        log("API server failed to start", "error", "api");
        resolve(false);
      }
    }, 8000); // Increased from 5000 to 8000ms
  });
}

// Start frontend server
async function startFrontendServer() {
  if (frontendProcess) {
    log("Frontend is already running", "warning", "frontend");
    return false;
  }

  const frontendInUse = await isPortInUse(3000);
  if (frontendInUse) {
    log("Port 3000 is already in use", "error", "frontend");
    await killProcessOnPort(3000);
    log("Killed existing process on port 3000", "info", "frontend");
  }

  log("Starting frontend server...", "info", "frontend");

  const frontendDir = path.join(__dirname, "..", "..", "admin-frontend");
  frontendProcess = spawn("pnpm", ["run", "dev"], {
    cwd: frontendDir,
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    },
  });

  frontendProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(line.trim(), "info", "frontend");
    });
  });

  frontendProcess.stderr.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(line.trim(), "error", "frontend");
    });
  });

  frontendProcess.on("close", (code) => {
    log(
      `Frontend server exited with code ${code}`,
      code === 0 ? "info" : "error",
      "frontend"
    );
    frontendProcess = null;
  });

  frontendProcess.on("error", (err) => {
    log(`Frontend server error: ${err.message}`, "error", "frontend");
    frontendProcess = null;
  });

  // Wait a bit and check if it started
  return new Promise((resolve) => {
    setTimeout(async () => {
      const started = await isPortInUse(3000);
      if (started) {
        log(
          "Frontend server started successfully on port 3000",
          "success",
          "frontend"
        );
        resolve(true);
      } else {
        log("Frontend server failed to start", "error", "frontend");
        resolve(false);
      }
    }, 10000); // Increased from 7000 to 10000ms
  });
}

// Stop API server
async function stopApiServer() {
  if (apiProcess) {
    log("Stopping API server...", "info", "api");
    apiProcess.kill("SIGTERM");
    apiProcess = null;

    // Make sure the port is released
    setTimeout(async () => {
      const stillRunning = await isPortInUse(3001);
      if (stillRunning) {
        await killProcessOnPort(3001);
        log("Forcefully killed API server process", "info", "api");
      }
    }, 2000);

    return true;
  } else {
    // Try to kill any process on port 3001
    const killed = await killProcessOnPort(3001);
    if (killed) {
      log("Killed process on port 3001", "info", "api");
    }
    return killed;
  }
}

// Stop frontend server
async function stopFrontendServer() {
  if (frontendProcess) {
    log("Stopping frontend server...", "info", "frontend");
    frontendProcess.kill("SIGTERM");
    frontendProcess = null;

    // Make sure the port is released
    setTimeout(async () => {
      const stillRunning = await isPortInUse(3000);
      if (stillRunning) {
        await killProcessOnPort(3000);
        log("Forcefully killed frontend process", "info", "frontend");
      }
    }, 2000);

    return true;
  } else {
    // Try to kill any process on port 3000
    const killed = await killProcessOnPort(3000);
    if (killed) {
      log("Killed process on port 3000", "info", "frontend");
    }
    return killed;
  }
}

// Reset database
async function resetDatabase() {
  log("Resetting database...", "info", "control");

  const dbPath = path.join(
    __dirname,
    "..",
    "..",
    "api-server",
    "data",
    "app.db"
  );

  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      log("Database file deleted", "info", "control");
    }

    // Restart API server to recreate database
    if (apiProcess) {
      await stopApiServer();
      setTimeout(() => startApiServer(), 3000);
      log(
        "Database will be recreated when API server restarts",
        "info",
        "control"
      );
    } else {
      log(
        "Database reset. Start API server to recreate it.",
        "info",
        "control"
      );
    }

    return true;
  } catch (error) {
    log(`Failed to reset database: ${error.message}`, "error", "control");
    return false;
  }
}

// Get status of all services
async function getStatus() {
  const apiRunning = await isPortInUse(3001);
  const frontendRunning = await isPortInUse(3000);
  const apiProcess = await getProcessOnPort(3001);
  const frontendProcess = await getProcessOnPort(3000);

  return {
    api: {
      running: apiRunning,
      port: 3001,
      process: apiProcess,
      url: "http://localhost:3001",
    },
    frontend: {
      running: frontendRunning,
      port: 3000,
      process: frontendProcess,
      url: "http://localhost:3000",
    },
    control: {
      running: true,
      port: PORT,
      url: `http://localhost:${PORT}`,
    },
  };
}

// API Routes
app.get("/api/status", async (req, res) => {
  const status = await getStatus();
  res.json(status);
});

app.post("/api/start/api", async (req, res) => {
  const success = await startApiServer();
  res.json({
    success,
    message: success ? "API server starting..." : "Failed to start API server",
  });
});

app.post("/api/start/frontend", async (req, res) => {
  const success = await startFrontendServer();
  res.json({
    success,
    message: success ? "Frontend starting..." : "Failed to start frontend",
  });
});

app.post("/api/start/all", async (req, res) => {
  const apiSuccess = await startApiServer();

  // Only start frontend if API started successfully
  if (apiSuccess) {
    setTimeout(async () => {
      const frontendSuccess = await startFrontendServer();
    }, 3000);
  }

  res.json({
    success: apiSuccess,
    message: apiSuccess
      ? "Starting all services..."
      : "Failed to start API server",
  });
});

app.post("/api/stop/api", async (req, res) => {
  const success = await stopApiServer();
  res.json({
    success,
    message: success ? "API server stopping..." : "Failed to stop API server",
  });
});

app.post("/api/stop/frontend", async (req, res) => {
  const success = await stopFrontendServer();
  res.json({
    success,
    message: success ? "Frontend stopping..." : "Failed to stop frontend",
  });
});

app.post("/api/stop/all", async (req, res) => {
  await stopApiServer();
  await stopFrontendServer();
  res.json({ success: true, message: "Stopping all services..." });
});

app.post("/api/restart/api", async (req, res) => {
  await stopApiServer();
  setTimeout(() => startApiServer(), 2000);
  res.json({ success: true, message: "Restarting API server..." });
});

app.post("/api/restart/frontend", async (req, res) => {
  await stopFrontendServer();
  setTimeout(() => startFrontendServer(), 2000);
  res.json({ success: true, message: "Restarting frontend..." });
});

app.post("/api/restart/all", async (req, res) => {
  await stopApiServer();
  await stopFrontendServer();
  setTimeout(async () => {
    await startApiServer();
    setTimeout(() => startFrontendServer(), 2000);
  }, 2000);
  res.json({ success: true, message: "Restarting all services..." });
});

app.post("/api/database/reset", async (req, res) => {
  const success = await resetDatabase();
  res.json({
    success,
    message: success
      ? "Database reset successfully"
      : "Failed to reset database",
  });
});

app.get("/api/logs/:service", (req, res) => {
  const service = req.params.service;
  const logs = logStreams[service] || [];
  res.json(logs);
});

app.get("/api/logs", (req, res) => {
  res.json(logStreams);
});

// Install dependencies
app.post("/api/install", (req, res) => {
  log("Installing dependencies...", "info", "control");

  const installApi = spawn("pnpm", ["install"], {
    cwd: path.join(__dirname, "..", "..", "api-server"),
    shell: true,
  });

  const installFrontend = spawn("pnpm", ["install"], {
    cwd: path.join(__dirname, "..", "..", "admin-frontend"),
    shell: true,
  });

  let apiDone = false;
  let frontendDone = false;

  installApi.on("close", (code) => {
    apiDone = true;
    log(
      `API dependencies installed (exit code: ${code})`,
      code === 0 ? "success" : "error",
      "control"
    );
    if (frontendDone) {
      log("All dependencies installed!", "success", "control");
    }
  });

  installFrontend.on("close", (code) => {
    frontendDone = true;
    log(
      `Frontend dependencies installed (exit code: ${code})`,
      code === 0 ? "success" : "error",
      "control"
    );
    if (apiDone) {
      log("All dependencies installed!", "success", "control");
    }
  });

  res.json({ success: true, message: "Installing dependencies..." });
});

// Serve the control panel UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Load recent logs on startup
async function loadRecentLogs() {
  try {
    const apiLogs = await readRecentLogs("api-server");
    const frontendLogs = await readRecentLogs("frontend");

    if (apiLogs.length > 0) {
      logStreams.api = apiLogs;
      log(`Loaded ${apiLogs.length} recent API logs`, "info", "control");
    }

    if (frontendLogs.length > 0) {
      logStreams.frontend = frontendLogs;
      log(
        `Loaded ${frontendLogs.length} recent frontend logs`,
        "info",
        "control"
      );
    }
  } catch (error) {
    log(`Error loading recent logs: ${error.message}`, "error", "control");
  }
}

// Start the control server
const server = app.listen(PORT, () => {
  log(
    `🎮 Krapi Development Control Panel started on http://localhost:${PORT}`,
    "success",
    "control"
  );
  log(`📡 WebSocket server running on port 4001`, "info", "control");
  log(
    `🚀 Open http://localhost:${PORT} to access the control panel`,
    "info",
    "control"
  );

  // Load recent logs
  loadRecentLogs();
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  log("Shutting down control panel...", "info", "control");
  await stopApiServer();
  await stopFrontendServer();
  process.exit(0);
});

// Handle WebSocket connections
wss.on("connection", (ws) => {
  log("New WebSocket client connected", "info", "control");

  // Send initial logs to the new client
  ws.send(JSON.stringify({ type: "init", data: logStreams }));

  // Handle incoming messages
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "ping") {
        ws.send(
          JSON.stringify({ type: "pong", timestamp: new Date().toISOString() })
        );
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    log("WebSocket client disconnected", "info", "control");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
