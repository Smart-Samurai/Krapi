const { spawn, exec } = require("child_process");
const path = require("path");

console.log("================================================");
console.log("      KRAPI CMS - STARTING ALL SERVICES");
console.log("================================================");
console.log("");

let apiProcess, frontendProcess, controlProcess;
let frontendStarted = false;
let controlStarted = false;

// Kill processes on specific ports
function killPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve();
        return;
      }

      const lines = stdout.split("\n");
      const promises = [];

      for (const line of lines) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0") {
            promises.push(
              new Promise((res) => {
                exec(`taskkill /f /pid ${pid}`, () => res());
              })
            );
          }
        }
      }

      Promise.all(promises).then(() => resolve());
    });
  });
}

// Clean up ports before starting
async function cleanupPorts() {
  console.log("Cleaning up ports...");
  await killPort(4001); // WebSocket port
  await killPort(4000); // Control panel port
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a bit
}

// Start API Server
async function startServices() {
  await cleanupPorts();

  console.log("Starting API Server on port 3001...");
  apiProcess = spawn("pnpm", ["run", "dev"], {
    cwd: path.join(__dirname, "api-server"),
    stdio: ["ignore", "pipe", "pipe"], // Changed from "inherit" to "ignore" for stdin
    shell: true,
    windowsHide: true, // Hide the command window on Windows
  });

  apiProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log(`[API] ${output.trim()}`);
    if (output.includes("Server running on port") && !frontendStarted) {
      console.log("✅ API Server ready at http://localhost:3001");
      startFrontend();
    }
  });

  apiProcess.stderr.on("data", (data) => {
    const output = data.toString();
    console.log(`[API ERROR] ${output.trim()}`);
    if (output.includes("Server running on port") && !frontendStarted) {
      console.log("✅ API Server ready at http://localhost:3001");
      startFrontend();
    }
  });

  apiProcess.on("error", (error) => {
    console.error(`[API ERROR] ${error.message}`);
  });

  // Fallback - if we don't get the startup message, assume it's ready after a timeout
  setTimeout(() => {
    if (!frontendStarted) {
      console.log("✅ API Server ready at http://localhost:3001 (fallback)");
      startFrontend();
    }
  }, 10000);
}

// Start Frontend after API is ready
function startFrontend() {
  if (frontendStarted) return;
  frontendStarted = true;

  setTimeout(() => {
    console.log("Starting Admin Frontend on port 3000...");
    frontendProcess = spawn("pnpm", ["run", "dev"], {
      cwd: path.join(__dirname, "admin-frontend"),
      stdio: ["ignore", "pipe", "pipe"], // Changed from "inherit" to "ignore" for stdin
      shell: true,
      windowsHide: true, // Hide the command window on Windows
    });

    let frontendReady = false;

    frontendProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[FRONTEND] ${output.trim()}`);
      if (
        (output.includes("Ready in") ||
          output.includes("Local:") ||
          output.includes("localhost:3000")) &&
        !frontendReady
      ) {
        frontendReady = true;
        console.log("✅ Frontend ready at http://localhost:3000");
        startControlPanel();
      }
    });

    frontendProcess.stderr.on("data", (data) => {
      const output = data.toString();
      console.log(`[FRONTEND ERROR] ${output.trim()}`);
      if (
        (output.includes("Local:") ||
          output.includes("Ready in") ||
          output.includes("localhost:3000")) &&
        !frontendReady
      ) {
        frontendReady = true;
        console.log("✅ Frontend ready at http://localhost:3000");
        startControlPanel();
      }
    });

    frontendProcess.on("error", (error) => {
      console.error(`[FRONTEND ERROR] ${error.message}`);
    });

    // Fallback - if we don't get the startup message, assume it's ready after a timeout
    setTimeout(() => {
      if (!frontendReady) {
        frontendReady = true;
        console.log("✅ Frontend ready at http://localhost:3000 (fallback)");
        startControlPanel();
      }
    }, 15000);
  }, 3000);
}

// Start Control Panel after Frontend is ready
function startControlPanel() {
  if (controlStarted) return;
  controlStarted = true;

  setTimeout(() => {
    console.log("Starting Development Control Panel on port 4000...");
    controlProcess = spawn("node", ["server.js"], {
      cwd: path.join(__dirname, "development", "dev-control"),
      stdio: ["ignore", "pipe", "pipe"], // Changed from "inherit" to "ignore" for stdin
      shell: true,
      windowsHide: true, // Hide the command window on Windows
    });

    let controlReady = false;

    controlProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[CONTROL] ${output.trim()}`);
      if (
        (output.includes("Control Panel started") ||
          output.includes("running on port 4000")) &&
        !controlReady
      ) {
        controlReady = true;
        console.log("✅ Control Panel ready at http://localhost:4000");
        showCompletionMessage();
      }
    });

    controlProcess.stderr.on("data", (data) => {
      console.error(`[CONTROL ERROR] ${data.toString().trim()}`);
    });

    controlProcess.on("error", (error) => {
      console.error(`[CONTROL ERROR] ${error.message}`);
    });

    // Fallback - if we don't get the startup message, assume it's ready after a timeout
    setTimeout(() => {
      if (!controlReady) {
        controlReady = true;
        console.log(
          "✅ Control Panel ready at http://localhost:4000 (fallback)"
        );
        showCompletionMessage();
      }
    }, 8000);
  }, 3000);
}

// Show completion message and open browser
function showCompletionMessage() {
  setTimeout(() => {
    console.log("");
    console.log("================================================");
    console.log("           ALL SERVICES ARE RUNNING");
    console.log("================================================");
    console.log("");
    console.log("📱 Admin Dashboard:  http://localhost:3000");
    console.log("🔧 API Server:       http://localhost:3001");
    console.log("🎮 Control Panel:    http://localhost:4000");
    console.log("");
    console.log("🔑 Default Login: admin / admin123");
    console.log("");
    console.log("Opening Control Panel in browser...");

    // Open browser safely without closing existing windows
    // Try to use the default browser, fallback to Firefox if needed
    const { spawn } = require("child_process");

    // First try to open with default browser
    const defaultBrowser = spawn(
      "cmd",
      ["/c", "start", "", "http://localhost:4000"],
      {
        detached: true,
        stdio: "ignore",
      }
    );

    // If that fails, try Firefox specifically
    defaultBrowser.on("error", () => {
      console.log("Trying Firefox...");
      spawn("firefox", ["http://localhost:4000"], {
        detached: true,
        stdio: "ignore",
      });
    });

    console.log("");
    console.log("💡 Press Ctrl+C to stop all services");
    console.log("");
  }, 1000);
}

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down all services...");

  if (apiProcess) {
    apiProcess.kill("SIGTERM");
    console.log("✅ API Server stopped");
  }

  if (frontendProcess) {
    frontendProcess.kill("SIGTERM");
    console.log("✅ Frontend stopped");
  }

  if (controlProcess) {
    controlProcess.kill("SIGTERM");
    console.log("✅ Control Panel stopped");
  }

  // Clean up ports
  setTimeout(async () => {
    await killPort(4001);
    await killPort(4000);
    console.log("\n✅ All services stopped successfully");
    process.exit(0);
  }, 1000);
});

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start everything
startServices();
