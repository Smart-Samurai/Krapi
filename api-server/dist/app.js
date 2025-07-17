"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastToAll = broadcastToAll;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
// Removed express-ws in favor of ws
const auth_1 = require("./services/auth");
const email_1 = require("./services/email");
const mcp_1 = require("./controllers/mcp");
const http = __importStar(require("http"));
const ws_1 = __importStar(require("ws"));
const url_1 = require("url");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: "/ws" });
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === "production"
        ? "*" // Allow all origins in production since nginx handles the routing
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost",
        ], // Allow Next.js dev server and nginx
    credentials: false, // Set to false since we're using JWT tokens in headers
}));
// Logging
app.use((0, morgan_1.default)("combined"));
// Body parsing
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Routes
app.use("/", routes_1.default);
// Error handling middleware
app.use((err, req, res, _next) => {
    console.error("Error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
    });
});
// WebSocket connection handling
// Store active connections for broadcasting
const activeConnections = new Map();
wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection attempt");
    // Extract token from query string
    const url = req.url || "";
    const qs = url.split("?")[1] || "";
    const params = new url_1.URLSearchParams(qs);
    const token = params.get("token");
    if (!token) {
        console.log("WebSocket connection rejected: No token provided");
        ws.close(1008, "Authentication required");
        return;
    }
    const payload = auth_1.AuthService.verifyToken(token);
    if (!payload) {
        console.log("WebSocket connection rejected: Invalid token");
        ws.close(1008, "Invalid or expired token");
        return;
    }
    const connectionId = `${payload.userId}-${Date.now()}`;
    activeConnections.set(connectionId, ws);
    console.log(`WebSocket connected for user ${payload.username} (ID: ${connectionId})`);
    // Send welcome message
    ws.send(JSON.stringify({
        type: "connection",
        event: "connected",
        user: payload.username,
        timestamp: new Date().toISOString(),
    }));
    // Handle incoming messages
    ws.on("message", (message) => {
        try {
            const messageString = message.toString();
            console.log(`WebSocket message from ${payload.username}:`, messageString);
            const data = JSON.parse(messageString);
            // Handle different message types
            switch (data.type) {
                case "ping":
                    ws.send(JSON.stringify({
                        type: "pong",
                        timestamp: new Date().toISOString(),
                    }));
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
        }
        catch (error) {
            console.error("Error processing WebSocket message:", error);
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format",
                timestamp: new Date().toISOString(),
            }));
        }
    });
    // Handle connection close
    ws.on("close", (code, reason) => {
        activeConnections.delete(connectionId);
        console.log(`WebSocket disconnected for user ${payload.username} (Code: ${code}, Reason: ${reason.toString()})`);
    });
    // Handle errors
    ws.on("error", (error) => {
        console.error(`WebSocket error for user ${payload.username}:`, error);
        activeConnections.delete(connectionId);
    });
});
// Function to broadcast messages to all connected clients
function broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    let sent = 0;
    let failed = 0;
    activeConnections.forEach((ws, connectionId) => {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(messageStr);
                sent++;
            }
            catch (error) {
                console.error(`Failed to send message to connection ${connectionId}:`, error);
                failed++;
            }
        }
        else {
            // Clean up closed connections
            activeConnections.delete(connectionId);
            failed++;
        }
    });
    console.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
}
// Start HTTP and WebSocket server
server.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📝 API docs: http://localhost:${PORT}/`);
    console.log(`👤 Default admin user: admin/admin123`);
    // Initialize email service with WebSocket broadcast function
    (0, email_1.setBroadcastFunction)(broadcastToAll);
    console.log(`📧 Email service initialized with WebSocket broadcasting`);
    // Initialize MCP server with Ollama integration
    await (0, mcp_1.initializeMcpServer)();
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📖 Shutting down MCP server...');
    await (0, mcp_1.shutdownMcpServer)();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('📖 Shutting down MCP server...');
    await (0, mcp_1.shutdownMcpServer)();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=app.js.map