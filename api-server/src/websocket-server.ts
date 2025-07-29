import WebSocket, { WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { URLSearchParams } from "url";
import { AuthService } from "./services/auth";

// Create WebSocket server on port 3471
const WS_PORT = parseInt(process.env.WS_PORT || "3471");
const wss = new WebSocketServer({ port: WS_PORT, path: "/ws" });

// Store active connections for broadcasting
const activeConnections = new Map<string, WebSocket>();

console.log(`🔌 WebSocket server starting on port ${WS_PORT}...`);

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

  const connectionId = `${payload.id}-${Date.now()}`;
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

      const data = JSON.parse(messageString);

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
        default:
          console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  // Handle connection close
  ws.on("close", (code, reason) => {
    activeConnections.delete(connectionId);
    console.log(
      `WebSocket disconnected for user ${
        payload.username
      } (Code: ${code}, Reason: ${reason.toString()})`
    );
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`WebSocket error for user ${payload.username}:`, error);
    activeConnections.delete(connectionId);
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

console.log(`🔌 WebSocket server running on port ${WS_PORT}`);
console.log(`📡 WebSocket endpoint: ws://localhost:${WS_PORT}/ws`);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📖 Shutting down WebSocket server...");
  wss.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📖 Shutting down WebSocket server...");
  wss.close();
  process.exit(0);
});
