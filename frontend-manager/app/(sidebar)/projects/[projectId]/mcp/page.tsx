/**
 * Project MCP Page
 * 
 * Page providing MCP (Model Context Protocol) interface for project-specific operations.
 * Allows LLM interaction with project database and operations.
 * 
 * @module app/(sidebar)/projects/[projectId]/mcp/page
 * @example
 * // Automatically rendered at /projects/[projectId]/mcp route
 */
"use client";

import { MessageSquare, Send, Bot, User, Wrench, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import {
  PageLayout,
  PageHeader,
  ActionButton,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Chat Message Interface
 * 
 * @interface ChatMessage
 * @property {"user" | "assistant" | "tool" | "system"} role - Message role
 * @property {string} content - Message content
 * @property {string} [tool_call_id] - Tool call ID
 * @property {string} [name] - Message name
 * @property {Array} [tool_calls] - Tool calls array
 */
interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
}

/**
 * Project MCP Page Component
 * 
 * Provides MCP (Model Context Protocol) interface for project-specific operations.
 * Allows LLM interaction with project database and operations.
 * 
 * @returns {JSX.Element} Project MCP page
 */
export default function ProjectMcpPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const { sessionToken } = useReduxAuth();
  const [provider, setProvider] = useState<"openai" | "lmstudio" | "ollama">("openai");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name?: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelCapabilities, setModelCapabilities] = useState<{
    supportsToolCalling: boolean;
    supportsFunctionCalling: boolean;
  } | null>(null);
  const [checkingCapabilities, setCheckingCapabilities] = useState(false);
  const [connected, setConnected] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(true);

  // Preset configurations
  const presets = {
    openai: {
      endpoint: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    },
    lmstudio: {
      endpoint: "http://localhost:1234/v1",
      model: "local-model",
    },
    ollama: {
      endpoint: "http://localhost:11434",
      model: "llama3.1:8b",
    },
  };

  const applyPreset = (presetProvider: "openai" | "lmstudio" | "ollama") => {
    setProvider(presetProvider);
    setEndpoint(presets[presetProvider].endpoint);
    setModel(presets[presetProvider].model);
    if (presetProvider === "openai") {
      // Don't auto-fill API key for OpenAI for security
    } else {
      setApiKey(""); // LM Studio and Ollama typically don't need API keys
    }
    setConnected(false);
    setAvailableModels([]);
    setModelCapabilities(null);
  };

  const initializeConnection = async () => {
    if (!endpoint) {
      setError("Please enter an endpoint URL");
      return;
    }

    setLoadingModels(true);
    setError(null);
    setConnected(false);

    try {
      if (!sessionToken) {
        setError("Please log in to continue");
        return;
      }

      const response = await fetch("/api/mcp/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey: apiKey || undefined,
        }),
      });

      const json = await response.json();
      if (json.success) {
        setAvailableModels(json.models || []);
        setConnected(true);
        if (json.models && json.models.length > 0 && !model) {
          // Auto-select first model
          setModel(json.models[0].id);
        }
      } else {
        setError(json.error || "Failed to connect to LLM server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingModels(false);
    }
  };

  const checkModelCapabilities = useCallback(async () => {
    if (!model || !endpoint) {
      return;
    }

    setCheckingCapabilities(true);
    try {
      if (!sessionToken) {
        return;
      }

      const response = await fetch("/api/mcp/model-capabilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey: apiKey || undefined,
          model,
        }),
      });

      const json = await response.json();
      if (json.success) {
        setModelCapabilities(json.capabilities);
      }
    } catch (_err: unknown) {
    } finally {
      setCheckingCapabilities(false);
    }
  }, [model, endpoint, provider, apiKey, sessionToken]);

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (!sessionToken) {
        setLoadingCredentials(false);
        return;
      }
      try {
        const response = await fetch(`/api/projects/${projectId}/settings`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Handle both direct data and wrapped response
          const settings = data.data || data;
          const credentials = settings?.ai_provider_credentials;
          if (credentials) {
            if (credentials.provider) setProvider(credentials.provider);
            if (credentials.endpoint) setEndpoint(credentials.endpoint);
            if (credentials.apiKey) setApiKey(credentials.apiKey);
            if (credentials.default_model) setModel(credentials.default_model);
          }
        }
      } catch (_err) {
        // Ignore errors when loading credentials
      } finally {
        setLoadingCredentials(false);
      }
    };
    loadSavedCredentials();
  }, [projectId, sessionToken]);

  // Check capabilities when model changes
  useEffect(() => {
    if (model && connected) {
      checkModelCapabilities();
    }
  }, [model, connected, checkModelCapabilities]);

  const saveCredentials = async () => {
    if (!sessionToken) {
      setError("Please log in to continue");
      return;
    }
    setSavingCredentials(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ai_provider_credentials: {
            provider,
            endpoint,
            apiKey: apiKey || undefined,
            default_model: model || undefined,
          },
        }),
      });
      if (response.ok) {
        toast.success("AI provider credentials saved as default");
        setError(null);
      } else {
        const json = await response.json();
        setError(json.error || "Failed to save credentials");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSavingCredentials(false);
    }
  };

  const send = async () => {
    if (!input || !endpoint || !model) return;
    const userMessage: ChatMessage = { role: "user", content: input };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      if (!sessionToken) {
        setError("Please log in to continue");
        setLoading(false);
        return;
      }

      const resp = await fetch(`/api/mcp/projects/${projectId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey: apiKey || undefined,
          model,
          messages: next,
        }),
      });

      const json = await resp.json();
      if (json.success) {
        setMessages(json.messages || next);
      } else {
        setError(json.error || "Failed to get response from LLM");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const messageKey = msg.tool_call_id || `${msg.role}-${msg.content.substring(0, 20)}-${index}`;
    if (msg.role === "tool") {
      return (
        <div
          key={messageKey}
          className="mb-4 p-3 bg-muted rounded-lg border-l-4 border-blue-500"
        >
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm text-blue-600">Tool Result</span>
            {msg.name && (
              <span className="text-xs text-muted-foreground">({msg.name})</span>
            )}
          </div>
          <pre className="text-base whitespace-pre-wrap break-words font-mono">
            {msg.content}
          </pre>
        </div>
      );
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return (
        <div key={messageKey} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-purple-500" />
            <span className="font-semibold text-purple-600">Assistant</span>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            {msg.content && (
              <p className="text-base mb-3 whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            )}
            <div className="space-y-2">
              {msg.tool_calls.map((tc) => (
                <div
                  key={tc.id}
                  className="p-2 bg-background rounded border border-purple-200"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-3 w-3 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600">
                      Calling: {tc.function.name}
                    </span>
                  </div>
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(JSON.parse(tc.function.arguments || "{}"), null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={messageKey}
        className={`mb-4 flex items-start gap-3 ${
          msg.role === "user" ? "justify-end" : ""
        }`}
      >
        {msg.role === "assistant" && (
          <Bot className="h-5 w-5 text-purple-500 mt-1" />
        )}
        {msg.role === "user" && (
          <User className="h-5 w-5 text-blue-500 mt-1" />
        )}
        <div
          className={`rounded-lg p-3 max-w-[80%] ${
            msg.role === "user"
              ? "bg-blue-500 text-white"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="text-base whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <PageHeader
        title="Project MCP"
        description="Use AI models with tool calling to manage collections, documents, and users in this project. Supports OpenAI, LM Studio, and Ollama."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            LLM Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Label>Quick Presets:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("openai")}
            >
              OpenAI
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("lmstudio")}
            >
              LM Studio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("ollama")}
            >
              Ollama
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) =>
                  setProvider(value as "openai" | "lmstudio" | "ollama")
                }
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="lmstudio">LM Studio</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={
                  provider === "openai"
                    ? "https://api.openai.com/v1"
                    : provider === "lmstudio"
                    ? "http://localhost:1234/v1"
                    : "http://localhost:11434"
                }
              />
            </div>
            {(provider === "openai" || provider === "lmstudio") && (
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  placeholder={
                    provider === "openai"
                      ? "sk-..."
                      : "Optional for LM Studio"
                  }
                />
              </div>
            )}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="model">Model</Label>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveCredentials}
                    disabled={savingCredentials || !endpoint || loadingCredentials}
                  >
                    {savingCredentials ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save as Default
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={initializeConnection}
                    disabled={loadingModels || !endpoint}
                  >
                    {loadingModels ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug className="mr-2 h-4 w-4" />
                        {connected ? "Refresh Models" : "Connect & Load Models"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {availableModels.length > 0 ? (
              <Select
                value={model}
                onValueChange={(value) => {
                  setModel(value);
                  checkModelCapabilities();
                }}
              >
                <SelectTrigger id="model" data-testid="mcp-model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === "openai"
                      ? "gpt-4o-mini"
                      : provider === "lmstudio"
                      ? "local-model"
                      : "llama3.1:8b"
                  }
                />
              )}
              {modelCapabilities && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {modelCapabilities.supportsToolCalling ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Tool calling supported</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-600">Tool calling may not be supported</span>
                    </>
                  )}
                  {checkingCapabilities && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-base">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 h-96 overflow-auto bg-background">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-base">
                  Start a conversation to manage your project database with AI
                </p>
                <p className="text-sm mt-2">
                  Try: &quot;List all collections&quot; or &quot;Create a user
                  collection with email and name fields&quot;
                </p>
              </div>
            ) : (
              messages.map((msg, index) => renderMessage(msg, index))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bot className="h-4 w-4 animate-pulse" />
                <span className="text-base">Thinking...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask to list collections, create documents, etc."
              disabled={loading}
              data-testid="mcp-chat-input"
            />
            <ActionButton
              variant="default"
              icon={Send}
              onClick={send}
              disabled={loading || !endpoint || !model || !input.trim()}
              data-testid="mcp-send-button"
            >
              {loading ? "Sending..." : "Send"}
            </ActionButton>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
