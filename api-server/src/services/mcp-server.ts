import WebSocket from "ws";
import { 
  McpRequest, 
  McpResponse, 
  McpServerConfig,
  McpTool,
  McpToolCall,
  McpToolResult,
  OllamaMessage 
} from "../types/mcp";
import { OllamaService } from "./ollama";
import { mcpTools, getAppStateContext } from "./mcp-tools";

export class McpServer {
  private ollamaService: OllamaService;
  private server: WebSocket.Server | null = null;
  private config: McpServerConfig;
  private isEnabled: boolean;
  private port: number;
  private debug: boolean;

  constructor() {
    this.ollamaService = new OllamaService();
    this.isEnabled = process.env.MCP_ENABLED === "true";
    this.port = parseInt(process.env.MCP_PORT || "3456");
    this.debug = process.env.MCP_DEBUG === "true";

    this.config = {
      name: "krapi-cms-mcp",
      description: "Model Context Protocol server for Krapi CMS with Ollama integration",
      version: "1.0.0",
      capabilities: {
        tools: true,
        resources: false,
        prompts: true,
      },
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (!this.isEnabled) {
      console.log("📖 MCP server is disabled");
      return;
    }

    // Check Ollama health before starting
    const ollamaHealthy = await this.ollamaService.healthCheck();
    if (!ollamaHealthy) {
      console.warn("⚠️  Ollama is not available. MCP server will start but AI features may not work.");
    }

    this.server = new WebSocket.Server({ 
      port: this.port,
      path: "/mcp"
    });

    this.server.on("connection", (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    console.log(`🤖 MCP Server started on port ${this.port}`);
    console.log(`📖 Available tools: ${mcpTools.map(t => t.name).join(", ")}`);
    
    if (ollamaHealthy) {
      const models = await this.ollamaService.listModels();
      console.log(`🧠 Available Ollama models: ${models.join(", ")}`);
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("📖 MCP Server stopped");
    }
  }

  /**
   * Handle WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    if (this.debug) {
      console.log("🔗 New MCP client connected");
    }

    ws.on("message", async (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString()) as McpRequest;
        const response = await this.handleRequest(message);
        ws.send(JSON.stringify(response));
      } catch (error) {
        const errorResponse: McpResponse = {
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on("close", () => {
      if (this.debug) {
        console.log("🔗 MCP client disconnected");
      }
    });

    ws.on("error", (error) => {
      console.error("🚨 MCP WebSocket error:", error);
    });

    // Send server info on connection
    const initMessage: McpResponse = {
      result: {
        type: "server_info",
        data: this.config,
      },
    };
    ws.send(JSON.stringify(initMessage));
  }

  /**
   * Handle MCP requests
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);

        case "tools/list":
          return this.handleListTools(request);

        case "tools/call":
          return await this.handleCallTool(request);

        case "ollama/chat":
          return await this.handleOllamaChat(request);

        case "ollama/models":
          return await this.handleOllamaModels(request);

        case "ollama/pull":
          return await this.handleOllamaPull(request);

        case "server/info":
          return this.handleServerInfo(request);

        default:
          return {
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
            id: request.id,
          };
      }
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: McpRequest): McpResponse {
    return {
      result: {
        protocolVersion: "1.0.0",
        capabilities: this.config.capabilities,
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      },
      id: request.id,
    };
  }

  /**
   * Handle list tools request
   */
  private handleListTools(request: McpRequest): McpResponse {
    const tools: McpTool[] = mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return {
      result: {
        tools,
      },
      id: request.id,
    };
  }

  /**
   * Handle tool call request
   */
  async handleCallTool(request: McpRequest): Promise<McpResponse> {
    const { name, arguments: args } = request.params as {
      name: string;
      arguments: Record<string, unknown>;
    };

    const tool = mcpTools.find((t) => t.name === name);
    if (!tool) {
      return {
        error: {
          code: -32602,
          message: `Tool not found: ${name}`,
        },
        id: request.id,
      };
    }

    try {
      const context = await getAppStateContext();
      const result = await tool.handler(args, context);

      return {
        result,
        id: request.id,
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle Ollama chat request
   */
  private async handleOllamaChat(request: McpRequest): Promise<McpResponse> {
    const { messages, model, tools, options } = request.params as {
      messages: OllamaMessage[];
      model?: string;
      tools?: boolean;
      options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
      };
    };

    try {
      // Create a working copy of messages
      let workingMessages = [...messages];
      const mcpToolsForOllama: McpTool[] = tools 
        ? mcpTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }))
        : [];

      // Make the initial chat request
      let response = await this.ollamaService.chat(workingMessages, {
        model,
        tools: mcpToolsForOllama,
        ...options,
      });

      // Handle tool calls if present
      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        const context = await getAppStateContext();
        
        // Add the assistant's response with tool calls to the conversation
        workingMessages.push(response.message);

        // Execute each tool call
        for (const toolCall of response.message.tool_calls) {
          const tool = mcpTools.find((t) => t.name === toolCall.function.name);
          if (tool) {
            try {
              const result = await tool.handler(toolCall.function.arguments, context);
              
              // Add tool result as a message
              workingMessages.push({
                role: "tool",
                content: result.content[0].text,
                // Include tool call ID if available
              });
            } catch (error) {
              workingMessages.push({
                role: "tool",
                content: `Error executing tool ${toolCall.function.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
              });
            }
          }
        }

        // Make a follow-up request with the tool results
        response = await this.ollamaService.chat(workingMessages, {
          model,
          tools: [], // Don't send tools again for the follow-up
          ...options,
        });
      }

      return {
        result: response,
        id: request.id,
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Ollama chat failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle Ollama models request
   */
  private async handleOllamaModels(request: McpRequest): Promise<McpResponse> {
    try {
      const models = await this.ollamaService.listModels();
      const defaultModel = this.ollamaService.getDefaultModel();

      return {
        result: {
          models,
          defaultModel,
          baseUrl: this.ollamaService.getBaseUrl(),
        },
        id: request.id,
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Failed to list Ollama models: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle Ollama pull model request
   */
  private async handleOllamaPull(request: McpRequest): Promise<McpResponse> {
    const { model } = request.params as { model: string };

    try {
      const success = await this.ollamaService.pullModel(model);

      return {
        result: {
          success,
          message: success 
            ? `Model ${model} pulled successfully` 
            : `Failed to pull model ${model}`,
        },
        id: request.id,
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Failed to pull model: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        id: request.id,
      };
    }
  }

  /**
   * Handle server info request
   */
  private handleServerInfo(request: McpRequest): McpResponse {
    return {
      result: {
        ...this.config,
        ollama: {
          baseUrl: this.ollamaService.getBaseUrl(),
          defaultModel: this.ollamaService.getDefaultModel(),
        },
        tools: mcpTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
        })),
      },
      id: request.id,
    };
  }

  /**
   * Get server configuration
   */
  getConfig(): McpServerConfig {
    return this.config;
  }

  /**
   * Check if server is enabled
   */
  isServerEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get Ollama service instance
   */
  getOllamaService(): OllamaService {
    return this.ollamaService;
  }
}