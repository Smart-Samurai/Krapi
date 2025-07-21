import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes";
// Removed express-ws in favor of ws
import { AuthService } from "./services/auth";
import { setBroadcastFunction } from "./services/email";
import { initializeMcpServer, shutdownMcpServer } from "./controllers/mcp";
// Initialize project database
import "./services/project-database";
import * as http from "http";
import { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { URLSearchParams } from "url";

// Load environment variables
dotenv.config();

const app: express.Application = express();
// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const PORT = process.env.PORT || 3470;
// WebSocket is integrated into the same HTTP server, no separate port needed

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "*" // Allow all origins in production since nginx handles the routing
        : process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
        : [
            "http://localhost:3469", // Frontend dev server
            "http://localhost:3000", // Alternative frontend port
            "http://localhost", // Local development
          ],
    credentials: false, // Set to false since we're using JWT tokens in headers
  })
);

// Logging
app.use(morgan("combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/", routes);

// Error handling middleware
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// WebSocket connection handling
// Store active connections for broadcasting
const activeConnections = new Map<string, WebSocket>();

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  console.log("New WebSocket connection attempt");

  // Extract token from query string
  const url = req.url || "";
  const qs = url.split("?")[1] || "";
  const params = new URLSearchParams(qs);
  const token = params.get("token");

  if (!token) {
    console.log("WebSocket connection rejected: No token provided");
    ws.close(1008, "Authentication required");
    return;
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    console.log("WebSocket connection rejected: Invalid token");
    ws.close(1008, "Invalid or expired token");
    return;
  }

  const connectionId = `${payload.userId}-${Date.now()}`;
  activeConnections.set(connectionId, ws);

  console.log(
    `WebSocket connected for user ${payload.username} (ID: ${connectionId})`
  );

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connection",
      event: "connected",
      user: payload.username,
      timestamp: new Date().toISOString(),
    })
  );

  // Handle incoming messages
  ws.on("message", (message: WebSocket.RawData) => {
    try {
      const messageString = message.toString();
      console.log(`WebSocket message from ${payload.username}:`, messageString);

      let data;
      try {
        data = JSON.parse(messageString);
      } catch {
        console.warn("Non-JSON WebSocket message received:", messageString);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Message must be valid JSON",
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // Handle different message types
      switch (data.type) {
        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            })
          );
          break;
        case "broadcast":
          // Broadcast to all connected users
          broadcastToAll({
            type: "broadcast",
            from: payload.username,
            message: data.message,
            timestamp: new Date().toISOString(),
          });
          break;
        case "heartbeat":
          // Keep connection alive
          ws.send(
            JSON.stringify({
              type: "heartbeat-ack",
              timestamp: new Date().toISOString(),
            })
          );
          break;
        default:
          console.log("Unknown message type:", data.type);
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Unknown message type: ${data.type}`,
              timestamp: new Date().toISOString(),
            })
          );
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Internal server error processing message",
            timestamp: new Date().toISOString(),
          })
        );
      } catch (sendError) {
        console.error("Failed to send error response:", sendError);
      }
    }
  });

  // Handle connection close
  ws.on("close", (code, reason) => {
    activeConnections.delete(connectionId);
    const reasonStr = reason.toString();
    console.log(
      `WebSocket disconnected for user ${
        payload.username
      } (Code: ${code}, Reason: ${reasonStr || "None"})`
    );

    // Log unusual close codes for debugging
    if (code !== 1000 && code !== 1001) {
      console.warn(
        `Unusual WebSocket close code ${code} for user ${payload.username}`
      );
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`WebSocket error for user ${payload.username}:`, error);
    activeConnections.delete(connectionId);

    // Try to close the connection gracefully if it's still open
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, "Server error");
      }
    } catch (closeError) {
      console.error("Error closing WebSocket after error:", closeError);
    }
  });
});

// Function to broadcast messages to all connected clients
function broadcastToAll(message: Record<string, unknown>) {
  const messageStr = JSON.stringify(message);
  let sent = 0;
  let failed = 0;

  activeConnections.forEach((ws, connectionId) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
        sent++;
      } catch (error) {
        console.error(
          `Failed to send message to connection ${connectionId}:`,
          error
        );
        failed++;
      }
    } else {
      // Clean up closed connections
      activeConnections.delete(connectionId);
      failed++;
    }
  });

  console.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
}

// Export broadcast function for use in other modules
export { broadcastToAll };

// Start HTTP and WebSocket server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API docs: http://localhost:${PORT}/`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`Default admin user: admin/admin123`);

  // Initialize email service with WebSocket broadcast function
  setBroadcastFunction(broadcastToAll);
  console.log(`Email service initialized with WebSocket broadcasting`);

  // Initialize MCP server with Ollama integration (non-blocking)
  // Don't await this to prevent blocking server startup
  initializeMcpServer().catch((error) => {
    console.warn(
      "MCP server initialization failed (this is normal if MCP is disabled or Ollama is not available):",
      error.message
    );
  });
});

// Error handling for unhandled promises and exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit the process immediately, allow graceful cleanup
  global.setTimeout(() => {
    console.error("Exiting due to uncaught exception");
    process.exit(1);
  }, 1000);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  try {
    await shutdownMcpServer();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  try {
    await shutdownMcpServer();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

export default app;
