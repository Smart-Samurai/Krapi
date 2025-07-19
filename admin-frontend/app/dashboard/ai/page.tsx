"use client";

import { useState, useEffect } from "react";
import { mcpAPI, ollamaAPI } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
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
  Settings,
  Wifi,
  WifiOff,
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

  // Tool testing state
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [toolArgs, setToolArgs] = useState<string>("{}");
  const [toolResult, setToolResult] = useState<any>(null);
  const [toolLoading, setToolLoading] = useState(false);

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
      }

      if (toolsResponse.success) {
        setTools(toolsResponse.data.tools || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI data");
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
      const response = await ollamaAPI.chat(
        [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: inputMessage },
        ],
        {
          tools: true, // Enable MCP tools
          temperature: 0.7,
        }
      );

      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.data.message.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || "Chat failed");
      }
    } catch (err) {
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

  const testTool = async () => {
    if (!selectedTool || toolLoading) return;

    setToolLoading(true);
    setToolResult(null);

    try {
      const args = JSON.parse(toolArgs);
      const response = await mcpAPI.callTool(selectedTool, args);
      setToolResult(response);
    } catch (err) {
      setToolResult({
        success: false,
        error: err instanceof Error ? err.message : "Tool execution failed",
      });
    } finally {
      setToolLoading(false);
    }
  };

  const pullModel = async () => {
    if (!newModel.trim() || pullLoading) return;

    setPullLoading(true);
    try {
      const response = await ollamaAPI.pullModel(newModel);
      if (response.success) {
        // Reload models after successful pull
        const modelsResponse = await ollamaAPI.listModels();
        if (modelsResponse.success) {
          setModels(modelsResponse.data);
        }
        setNewModel("");
      } else {
        throw new Error(response.error || "Failed to pull model");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model pull failed");
    } finally {
      setPullLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading AI system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI & MCP Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MCP Server</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={mcpInfo?.enabled ? "default" : "secondary"}>
                {mcpInfo?.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <span className="text-sm text-gray-600">
                {mcpInfo?.server.version}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ollama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={mcpInfo?.ollama.healthy ? "default" : "destructive"}
              >
                {mcpInfo?.ollama.healthy ? "Healthy" : "Disconnected"}
              </Badge>
              <span className="text-sm text-gray-600">
                {models?.models.length || 0} models
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MCP Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">{tools.length} tools available</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="tools">MCP Tools</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Chat with MCP Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-96 border rounded-lg p-4 overflow-y-auto bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Start a conversation! The AI can use MCP tools to help you
                    manage content, users, and more.
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-white border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-left">
                    <div className="inline-block bg-white border rounded-lg px-4 py-2">
                      <Bot className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={chatLoading}
                >
                  <option value="">Select Model</option>
                  {models?.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the AI to help manage your CMS..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  disabled={chatLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={chatLoading || !inputMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available MCP Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTool === tool.name
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedTool(tool.name)}
                    >
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-gray-600">
                        {tool.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Tool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTool && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Arguments (JSON)
                      </label>
                      <Textarea
                        value={toolArgs}
                        onChange={(e) => setToolArgs(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={4}
                      />
                    </div>

                    <Button onClick={testTool} disabled={toolLoading}>
                      {toolLoading ? "Running..." : "Run Tool"}
                    </Button>

                    {toolResult && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Result
                        </label>
                        <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto">
                          {JSON.stringify(toolResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
                {!selectedTool && (
                  <p className="text-gray-500">Select a tool to test it</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Ollama Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Pull New Model</h3>
                <div className="flex gap-2">
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="Model name (e.g., llama3.2:3b)"
                  />
                  <Button onClick={pullModel} disabled={pullLoading}>
                    {pullLoading ? "Pulling..." : "Pull Model"}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Available Models</h3>
                <div className="space-y-2">
                  {models?.models.map((model) => (
                    <div
                      key={model}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-mono text-sm">{model}</span>
                      {model === models.defaultModel && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ollama Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ollama Endpoint
                </label>
                <div className="flex gap-2">
                  <Input
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                  />
                  <Button
                    onClick={() => {
                      // TODO: Implement endpoint update
                      console.log("Update endpoint:", ollamaEndpoint);
                    }}
                    className="flex items-center gap-2"
                  >
                    {mcpInfo?.ollama.healthy ? (
                      <Wifi className="h-4 w-4" />
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Default Ollama endpoint is http://localhost:11434
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {mcpInfo?.ollama.healthy ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    Status:{" "}
                    {mcpInfo?.ollama.healthy ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
