"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function WebSocketStatus() {
  const { socket } = useAuth();
  const [lastMessage, setLastMessage] = useState<string>("");
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(
            `${data.type}: ${data.event || data.message || "No content"}`
          );
          setMessageCount((prev) => prev + 1);
        } catch {
          setLastMessage(`Raw: ${event.data}`);
          setMessageCount((prev) => prev + 1);
        }
      };

      socket.addEventListener("message", handleMessage);

      return () => {
        socket.removeEventListener("message", handleMessage);
      };
    }
  }, [socket]);

  const sendTestMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "ping",
          timestamp: new Date().toISOString(),
        })
      );
    }
  };

  const sendBroadcastMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "broadcast",
          message: "Hello from admin panel!",
          timestamp: new Date().toISOString(),
        })
      );
    }
  };

  const isConnected = socket && socket.readyState === WebSocket.OPEN;

  return (
    <div className="bg-background-100 dark:bg-background-100 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          WebSocket Status
        </h3>
        <span
          className={`px-2 py-1 rounded text-sm ${
            isConnected
              ? "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-text-600 dark:text-text-400">
            Messages received: {messageCount}
          </p>
          {lastMessage && (
            <p className="text-sm bg-background-100 dark:bg-background-100 p-2 rounded mt-1 font-mono">
              {lastMessage}
            </p>
          )}
        </div>

        {isConnected && (
          <div className="flex gap-2">
            <button
              onClick={sendTestMessage}
              className="px-3 py-1 bg-primary-500 text-white rounded text-sm hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              Send Ping
            </button>
            <button
              onClick={sendBroadcastMessage}
              className="px-3 py-1 bg-accent-500 text-white rounded text-sm hover:bg-accent-600 dark:bg-accent-500 dark:hover:bg-accent-400"
            >
              Send Broadcast
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
