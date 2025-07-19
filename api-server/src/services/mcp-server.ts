import { Request, Response } from "express";
import { 
  McpRequest, 
  McpResponse, 
  McpServerConfig, 
  McpTool,
  McpToolResult,
  OllamaMessage
} from "../types/mcp";
import { OllamaService } from "./ollama";
import { mcpTools, getAppStateContext } from "./mcp-tools";
import { 
  isValidToolResult, 
  isValidOllamaMessage, 
  isValidToolCall,
  assertDefined,
  createErrorResponse,
  TypedError
} from "../utils/type-guards";

/**
 * MCP Server implementation
 */
export class McpServer {
  private config: McpServerConfig;
  private ollamaService: OllamaService;
  private isEnabled: boolean;
  private debug: boolean;

  constructor() {
    this.config = {
      name: "krapi-cms-mcp",
      description: "MCP server for KRAPI CMS with Ollama integration",
      version: "1.0.0",
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
    };

    this.ollamaService = new OllamaService();
    this.isEnabled = process.env.MCP_ENABLED === "true";
    this.debug = process.env.MCP_DEBUG === "true";
  }

  /**
   * Safely extract text content from a tool result
   */
  private extractToolResultContent(result: unknown, toolName: string): string {
    // Validate using type guard
    if (!isValidToolResult(result)) {
      console.error(`Tool ${toolName} returned invalid result:`, result);
      return `Error: Tool ${toolName} returned invalid result structure`;
    }

    // At this point, TypeScript knows result is McpToolResult
    if (result.content.length === 0) {
      console.warn(`Tool ${toolName} returned empty content array`);
      return `Tool ${toolName} completed but returned no content`;
    }

    // Safe access - we know content[0] exists and has text property
    return result.content[0].text;
  }

  /**
   * Check if the server is enabled
   */
  isServerEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get server configuration
   */
  getConfig(): McpServerConfig {
    return this.config;
  }

  /**
   * Get Ollama service instance
   */
  getOllamaService(): OllamaService {
    return this.ollamaService;
  }

  /**
   * Handle MCP request
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        case "tools/list":
          return this.handleToolsList(request);
        case "tools/call":
          return this.handleToolCall(request);
        case "ollama/chat":
          return await this.handleOllamaChat(request);
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
          message: error instanceof Error ? error.message : "Internal error",
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
        serverInfo: this.config,
        protocolVersion: "1.0.0",
      },
      id: request.id,
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(request: McpRequest): McpResponse {
    const tools = mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return {
      result: tools,
      id: request.id,
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(request: McpRequest): Promise<McpResponse> {
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
          message: `Tool execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
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
              
              // Safely extract content from the result
              const content = this.extractToolResultContent(result, toolCall.function.name);
              
              // Add tool result as a message
              workingMessages.push({
                role: "tool",
                content,
                // Include tool call ID if available
              });
            } catch (error) {
              const errorMessage = `Error executing tool ${toolCall.function.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
              console.error(errorMessage, error);
              workingMessages.push({
                role: "tool",
                content: errorMessage,
              });
            }
          } else {
            const errorMessage = `Tool ${toolCall.function.name} not found`;
            console.error(errorMessage);
            workingMessages.push({
              role: "tool",
              content: errorMessage,
            });
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
}