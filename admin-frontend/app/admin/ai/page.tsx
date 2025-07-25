"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot,
  Play,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Zap,
  Brain,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

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
  const [_ollamaUrl, _setOllamaUrl] = useState("http://localhost:11434");
  const [isOllamaHealthy, setIsOllamaHealthy] = useState(false);
  const [_isLoadingModels, _setIsLoadingModels] = useState(false);

  // MCP state
  const [_mcpInfo, setMcpInfo] = useState<McpInfo | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [_isMcpEnabled, _setIsMcpEnabled] = useState(true);

  // Model management
  const [newModelName, setNewModelName] = useState("");
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

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

  const _updateOllamaUrl = async () => {
    try {
      // Note: URL update is not implemented in the new API yet
      // Placeholder implementation
    } catch {
      setError("Failed to update Ollama URL");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI & MCP Management</h1>
          <p className="text-muted-foreground">
            Manage Ollama models and MCP server integration
          </p>
        </div>
        <Button onClick={loadData} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ollama Status</p>
                <p className="text-2xl font-bold">
                  {isOllamaHealthy ? "Healthy" : "Unhealthy"}
                </p>
              </div>
              {isOllamaHealthy ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">MCP Server</p>
                <p className="text-2xl font-bold">
                  {_isMcpEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available Models</p>
                <p className="text-2xl font-bold">{models.length}</p>
              </div>
              <Bot className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Messages */}
            <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Start a conversation with the AI
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
                  <div className="bg-muted px-4 py-2 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex space-x-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="flex justify-between">
              <Button variant="outline" onClick={clearChat}>
                Clear Chat
              </Button>
              <div className="text-sm text-muted-foreground">
                Current Model: {currentModel}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            Ollama Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pull New Model */}
            <div className="flex space-x-2">
              <Input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Model name (e.g., llama3.1:8b)"
                className="flex-1"
              />
              <Button
                onClick={pullModel}
                disabled={isPullingModel || !newModelName.trim()}
              >
                {isPullingModel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Pull Model
              </Button>
            </div>

            {/* Models List */}
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{model.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB •{" "}
                      {model.details.parameter_size}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        currentModel === model.name ? "default" : "secondary"
                      }
                    >
                      {currentModel === model.name ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadModel(model.name)}
                      disabled={isLoadingModel}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteModel(model.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCP Tools */}
      {mcpTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              MCP Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mcpTools.map((tool) => (
                <div key={tool.name} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
