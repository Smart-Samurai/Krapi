"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Play,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Zap,
  Brain,
  MessageSquare,
  Send,
  Loader2,
  BarChart3,
  Settings,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

interface McpInfo {
  server: {
    name: string;
    description: string;
    version: string;
  };
  enabled: boolean;
  ollama: {
    baseUrl: string;
    defaultModel: string;
    healthy: boolean;
  };
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export default function AIPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Ollama state
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [currentModel, setCurrentModel] = useState("llama3.1:8b");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [isOllamaHealthy, setIsOllamaHealthy] = useState(false);
  const [_isLoadingModels, _setIsLoadingModels] = useState(false);

  // MCP state
  const [mcpInfo, setMcpInfo] = useState<McpInfo | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [isMcpEnabled, setIsMcpEnabled] = useState(true);

  // Model management
  const [newModelName, setNewModelName] = useState("");
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [_isLoadingModel, _setIsLoadingModel] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the AI features.
          </p>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    try {
      // Note: AI functionality is not fully implemented in the new API yet
      // This is placeholder data for demonstration
      setModels([
        {
          name: "llama3.1:8b",
          size: 4.7 * 1024 * 1024 * 1024, // 4.7GB
          modified_at: new Date().toISOString(),
          digest: "sha256:abc123",
          details: {
            format: "gguf",
            family: "llama",
            parameter_size: "8B",
            quantization_level: "Q4_0",
          },
        },
      ]);
      setIsOllamaHealthy(true);
      setMcpInfo({
        server: {
          name: "krapi-cms-mcp",
          description: "MCP server for KRAPI CMS with Ollama integration",
          version: "1.0.0",
        },
        enabled: true,
        ollama: {
          baseUrl: "http://localhost:11434",
          defaultModel: "llama3.1:8b",
          healthy: true,
        },
      });
      setMcpTools([
        {
          name: "database_query",
          description: "Query the database",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
        },
      ]);
    } catch {
      setError("Failed to load AI configuration");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError("");

    try {
      // Note: Chat functionality is not implemented in the new API yet
      // This is a placeholder response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          "This is a placeholder response. AI chat functionality is not yet implemented in the new API.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  const pullModel = async () => {
    if (!newModelName.trim()) return;

    setIsPullingModel(true);
    try {
      // Note: Model pulling is not implemented in the new API yet
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setNewModelName("");
      // Refresh models list
      loadData();
    } catch {
      setError("Failed to pull model");
    } finally {
      setIsPullingModel(false);
    }
  };

  const loadModel = async (modelName: string) => {
    setIsLoadingModel(true);
    try {
      // Note: Model loading is not implemented in the new API yet
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentModel(modelName);
    } catch {
      setError("Failed to load model");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const deleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model '${modelName}'?`))
      return;

    try {
      // Note: Model deletion is not implemented in the new API yet
      setModels((prev) => prev.filter((model) => model.name !== modelName));
    } catch {
      setError("Failed to delete model");
    }
  };

  const updateOllamaUrl = async () => {
    try {
      // Note: URL update is not implemented in the new API yet
      // Placeholder implementation
    } catch {
      setError("Failed to update Ollama URL");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-text dark:text-text">
          AI & MCP Management
        </h1>
        <p className="text-lg text-text-muted dark:text-text-muted">
          Manage AI models and MCP tools for intelligent automation
        </p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-3" />
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MCP Server Status */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-3"></div>
              <h3 className="text-lg font-semibold text-text dark:text-text">
                MCP Server
              </h3>
            </div>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Status
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  mcpInfo?.enabled
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                {mcpInfo?.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Version
              </span>
              <span className="text-sm font-medium text-text dark:text-text">
                v{mcpInfo?.server.version || "Unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Tools
              </span>
              <span className="text-sm font-medium text-text dark:text-text">
                {mcpTools.length}
              </span>
            </div>
          </div>
        </div>

        {/* Ollama Status */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  isOllamaHealthy ? "bg-success" : "bg-error"
                }`}
              ></div>
              <h3 className="text-lg font-semibold text-text dark:text-text">
                Ollama
              </h3>
            </div>
            {isOllamaHealthy ? (
              <Wifi className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-error" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Status
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOllamaHealthy
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                {isOllamaHealthy ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Models
              </span>
              <span className="text-sm font-medium text-text dark:text-text">
                {models.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Current
              </span>
              <span className="text-sm font-medium text-text dark:text-text truncate max-w-24">
                {currentModel}
              </span>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-accent mr-3"></div>
              <h3 className="text-lg font-semibold text-text dark:text-text">
                System
              </h3>
            </div>
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Messages
              </span>
              <span className="text-sm font-medium text-text dark:text-text">
                {messages.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted dark:text-text-muted">
                Status
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isLoading
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                }`}
              >
                {isLoading ? "Processing" : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-secondary mr-3"></div>
              <h3 className="text-lg font-semibold text-text dark:text-text">
                Actions
              </h3>
            </div>
            <Settings className="h-5 w-5 text-secondary" />
          </div>
          <div className="space-y-2">
            <button
              onClick={loadData}
              disabled={_isLoadingModels}
              className="w-full flex items-center justify-center px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
            >
              {_isLoadingModels ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>
            <button
              onClick={clearChat}
              className="w-full flex items-center justify-center px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chat Messages */}
          <div className="bg-card border border-border rounded-lg h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-text-muted dark:text-text-muted py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-text-muted/50 dark:text-text-muted/50" />
                <p className="text-lg font-medium mb-2 text-text dark:text-text">
                  Start a conversation with the AI
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with the AI
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background-100 dark:bg-background-100 text-text px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your message... (e.g., 'Create a new route called test')"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-text placeholder:text-text-muted"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Model Management */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Brain className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold text-text dark:text-text">
                Model Management
              </h3>
            </div>

            {/* Current Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text dark:text-text mb-2">
                Current Model
              </label>
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text"
              >
                {models.length === 0 ? (
                  <option value="" disabled>
                    No models available
                  </option>
                ) : (
                  models.map((model, index) => {
                    const modelName =
                      typeof model === "string"
                        ? model
                        : model.name || `Model ${index}`;
                    const modelValue =
                      typeof model === "string"
                        ? model
                        : model.name || `model-${index}`;
                    return (
                      <option
                        key={`model-${index}-${modelValue}`}
                        value={modelValue}
                        className="bg-background text-text"
                      >
                        {modelName}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Pull New Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text dark:text-text mb-2">
                Pull New Model
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., llama3.1:8b"
                  className="flex-1 px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text placeholder:text-text-muted"
                />
                <button
                  onClick={pullModel}
                  disabled={!newModelName.trim() || isPullingModel}
                  className="px-3 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center"
                >
                  {isPullingModel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Model List */}
            <div>
              <label className="block text-sm font-medium text-text dark:text-text mb-2">
                Available Models
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {models.length === 0 ? (
                  <div className="text-center text-text-muted py-4">
                    No models available
                  </div>
                ) : (
                  models.map((model, index) => {
                    const modelName =
                      typeof model === "string"
                        ? model
                        : model.name || `Model ${index}`;
                    const modelValue =
                      typeof model === "string"
                        ? model
                        : model.name || `model-${index}`;
                    return (
                      <div
                        key={`model-item-${index}-${modelValue}`}
                        className="flex items-center justify-between p-2 bg-background-100 dark:bg-background-100 border border-border rounded-md hover:bg-background-200 dark:hover:bg-background-200 transition-colors"
                      >
                        <span className="text-sm font-medium text-text truncate">
                          {modelName}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => loadModel(modelValue)}
                            className="p-1 text-primary hover:text-primary-hover hover:bg-primary/10 rounded transition-colors"
                            title="Load model"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteModel(modelValue)}
                            className="p-1 text-error hover:text-error/80 hover:bg-error/10 rounded transition-colors"
                            title="Delete model"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Ollama Settings */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-secondary mr-2" />
              <h3 className="text-lg font-semibold text-text dark:text-text">
                Ollama Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-text mb-2">
                  Ollama URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text placeholder:text-text-muted"
                  />
                  <button
                    onClick={updateOllamaUrl}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text dark:text-text">
                  MCP Tools
                </span>
                <button
                  onClick={() => setIsMcpEnabled(!isMcpEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isMcpEnabled
                      ? "bg-primary"
                      : "bg-background-200 dark:bg-background-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isMcpEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Available Tools */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Zap className="h-5 w-5 text-accent mr-2" />
              <h3 className="text-lg font-semibold text-text dark:text-text">
                Available Tools
              </h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {mcpTools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3 bg-background-100 dark:bg-background-100 rounded-md border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-text mb-1">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-text-muted">
                        {tool.description}
                      </p>
                    </div>
                    <div className="ml-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-text-muted dark:text-text-muted">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              <span>Model: {currentModel}</span>
            </div>
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              <span>MCP Tools: {isMcpEnabled ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center">
              {isOllamaHealthy ? (
                <Wifi className="h-4 w-4 mr-2 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 mr-2 text-error" />
              )}
              <span>
                Ollama: {isOllamaHealthy ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="text-xs">{mcpTools.length} tools available</div>
        </div>
      </div>
    </div>
  );
}
