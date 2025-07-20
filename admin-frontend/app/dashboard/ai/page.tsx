"use client";

import { useState, useEffect } from "react";
import { mcpAPI, ollamaAPI } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  AlertCircle,
  Bot,
  Brain,
  MessageSquare,
  Zap,
  Wifi,
  WifiOff,
  Send,
  Loader2,
} from "lucide-react";

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

interface OllamaModel {
  models: string[];
  defaultModel: string;
  baseUrl: string;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export default function AIPage() {
  const [mcpInfo, setMcpInfo] = useState<McpInfo | null>(null);
  const [models, setModels] = useState<OllamaModel | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(
    "http://localhost:11434"
  );

  // Initialize chat with system message
  useEffect(() => {
    if (selectedModel && messages.length === 0) {
      const systemMessage: ChatMessage = {
        role: "system",
        content: "You are a helpful AI assistant with access to MCP tools. You can help manage content, users, files, and other system resources. Be concise and helpful in your responses.",
        timestamp: new Date(),
      };
      setMessages([systemMessage]);
    }
  }, [selectedModel]);

  // Model management
  const [newModel, setNewModel] = useState("");
  const [pullLoading, setPullLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mcpResponse, modelsResponse, toolsResponse] = await Promise.all([
        mcpAPI.getInfo(),
        ollamaAPI.listModels(),
        mcpAPI.listTools(),
      ]);

      if (mcpResponse.success) {
        setMcpInfo(mcpResponse.data);
      }

      if (modelsResponse.success) {
        setModels(modelsResponse.data);
        setSelectedModel(modelsResponse.data.defaultModel);
      }

      if (toolsResponse.success) {
        setTools(toolsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setChatLoading(true);

    try {
      // Ensure proper message format for the API
      const formattedMessages = [
        ...messages
          .filter((m) => m.role !== "system") // Exclude system messages from API call
          .map((m) => ({ 
            role: m.role, 
            content: m.content 
          })),
        { role: "user", content: inputMessage },
      ];

      const response = await ollamaAPI.chat(
        formattedMessages,
        {
          model: selectedModel,
          tools: true, // Enable MCP tools
          temperature: 0.7,
        }
      );

      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.data.message?.content || response.data.content || "No response content",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        console.error("Chat API error:", response);
        throw new Error(response.error || "Chat failed");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const pullModel = async () => {
    if (!newModel.trim() || pullLoading) return;

    setPullLoading(true);
    try {
      const response = await ollamaAPI.pullModel(newModel);
      if (response.success) {
        await loadData(); // Reload models
        setNewModel("");
      } else {
        throw new Error(response.error || "Failed to pull model");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pull model");
    } finally {
      setPullLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      // Here you would update the Ollama endpoint
      // For now, just reload the data
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-100">AI & MCP Management</h1>
          <p className="text-text-600 dark:text-text-400">
            Manage AI models and MCP tools for intelligent automation
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">MCP Server</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={mcpInfo?.enabled ? "default" : "secondary"}>
                {mcpInfo?.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <span className="text-sm text-text-500 dark:text-text-400">
                {mcpInfo?.server.version}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ollama Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={mcpInfo?.ollama.healthy ? "default" : "destructive"}
              >
                {mcpInfo?.ollama.healthy ? "Healthy" : "Disconnected"}
              </Badge>
              <span className="text-sm text-text-500 dark:text-text-400">
                {models?.models.length || 0} models
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">MCP Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{tools.length}</span>
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="tools">Available Tools</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Assistant with MCP Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-96 border border-background-300 rounded-lg p-4 overflow-y-auto bg-background-50 dark:bg-background-900">
                {messages.length === 0 && (
                  <div className="text-center text-text-500 dark:text-text-400 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-text-300 dark:text-text-600" />
                    <p>Start a conversation! I can help you manage:</p>
                    <ul className="mt-2 text-sm">
                      <li>• Content items and routes</li>
                      <li>• Users and permissions</li>
                      <li>• Files and schemas</li>
                      <li>• API endpoints and more</li>
                    </ul>
                    <p className="mt-4 text-xs">
                      Try: &quot;Show me all users and their roles&quot;
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    } ${msg.role === "system" ? "hidden" : ""}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary-500 text-text-50"
                          : msg.content.startsWith("Error:")
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-background-100 dark:bg-background-800 text-text-900 dark:text-text-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-text-100" : "text-text-500 dark:text-text-400"
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-left">
                    <div className="inline-block bg-background-100 dark:bg-background-800 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-text-600 dark:text-text-400" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={chatLoading}>
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-text-500 dark:text-text-400">
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  <span>Model: {selectedModel || "Default"}</span>
                </div>
                {mcpInfo?.ollama.healthy && (
                  <div className="flex items-center gap-1">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span>Connected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>Available MCP Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 border border-background-300 rounded-lg bg-background-50 dark:bg-background-900 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-lg mb-2 text-text-900 dark:text-text-100">{tool.name}</h4>
                    <p className="text-sm text-text-600 dark:text-text-400 mb-3">
                      {tool.description}
                    </p>
                    {tool.inputSchema.properties && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-text-500 dark:text-text-400">Parameters:</p>
                        {Object.entries(tool.inputSchema.properties).map(([key, prop]: [string, any]) => (
                          <div key={key} className="text-xs text-text-600 dark:text-text-400">
                            • <span className="font-mono">{key}</span>
                            {prop.description && `: ${prop.description}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {models?.models.map((model) => (
                    <div
                      key={model}
                      className={`p-3 border border-background-300 rounded-lg flex items-center justify-between ${
                        model === selectedModel
                          ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                          : "bg-background-50 dark:bg-background-900"
                      }`}
                    >
                      <span className="font-mono text-sm text-text-900 dark:text-text-100">{model}</span>
                      {model === selectedModel && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  ))}
                  {models?.models.length === 0 && (
                    <p className="text-text-500 dark:text-text-400 text-center py-4">
                      No models installed
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pull New Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Model Name
                  </label>
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="e.g., llama3.1:8b"
                  />
                  <p className="text-xs text-text-500 dark:text-text-400 mt-1">
                    Enter the model name from Ollama library
                  </p>
                </div>
                <Button
                  onClick={pullModel}
                  disabled={pullLoading}
                  className="w-full"
                >
                  {pullLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pulling...
                    </>
                  ) : (
                    "Pull Model"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Ollama Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ollama Endpoint
                </label>
                <Input
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-background-300 rounded-lg bg-background-50 dark:bg-background-900 text-text-900 dark:text-text-100"
                >
                  {models?.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={updateSettings} className="w-full">
                Update Settings
              </Button>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  {mcpInfo?.ollama.healthy ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">
                        Connected to Ollama at {mcpInfo.ollama.baseUrl}
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">
                        Cannot connect to Ollama
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
