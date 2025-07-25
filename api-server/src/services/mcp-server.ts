import { Request as _Request, Response as _Response } from "express";
import {
  McpRequest,
  McpResponse,
  McpServerConfig,
  McpTool,
  OllamaMessage,
} from "../types/mcp";
import { OllamaService } from "./ollama";
import { mcpTools, getAppStateContext } from "./mcp-tools";

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
    // Handle different result formats
    if (result && typeof result === "object") {
      // If result has a message property, use it
      if ("message" in result && typeof result.message === "string") {
        return result.message;
      }

      // If result has a success property and message, format it
      if ("success" in result) {
        if (result.success === true && "message" in result) {
          return String(result.message);
        } else if (result.success === false && "error" in result) {
          return `Error: ${result.error}`;
        }
      }

      // If result has content array (McpToolResult format)
      if (
        "content" in result &&
        Array.isArray(result.content) &&
        result.content.length > 0
      ) {
        const firstContent = result.content[0];
        if (
          firstContent &&
          typeof firstContent === "object" &&
          "text" in firstContent
        ) {
          return String(firstContent.text);
        }
      }

      // Fallback: stringify the result
      return JSON.stringify(result, null, 2);
    }

    // If result is a string, return it directly
    if (typeof result === "string") {
      return result;
    }

    // Fallback for unknown formats
    console.warn(`Tool ${toolName} returned unexpected result format:`, result);
    return `Tool ${toolName} completed with result: ${JSON.stringify(result)}`;
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
   * Get MCP tool definitions for Ollama
   */
  getToolDefinitions(): McpTool[] {
    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async (args: any, context: any) => {
        try {
          const result = await tool.handler(args, context);
          return {
            content: [
              {
                type: "text" as const,
                text: result.success
                  ? result.message || "Success"
                  : result.error || "Error",
              },
            ],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error executing tool ${tool.name}: ${error}`,
              },
            ],
            isError: true,
          };
        }
      },
    }));
  }

  /**
   * Convert MCP tools to Ollama tool format
   */
  private convertToolsToOllamaFormat(): any[] {
    return mcpTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
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
          code: -32601,
          message: `Tool not found: ${name}`,
        },
        id: request.id,
      };
    }

    try {
      const context = await getAppStateContext({}, {});
      const result = await tool.handler(args, context);

      return {
        result: {
          content: [
            {
              type: "text",
              text: result.success
                ? result.message || "Success"
                : result.error || "Error",
            },
          ],
          isError: !result.success,
        },
        id: request.id,
      };
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: `Error executing tool ${name}: ${error}`,
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
      console.log(
        "🔍 MCP Chat - Messages:",
        messages.length,
        "Tools enabled:",
        tools
      );
      const workingMessages = [...messages];

      // Convert MCP tools to Ollama tool format
      const ollamaTools = tools ? this.convertToolsToOllamaFormat() : [];

      console.log("🔍 MCP Server - Tools parameter:", tools);
      console.log("🔍 MCP Server - Converted tools count:", ollamaTools.length);
      console.log(
        "🔍 MCP Server - Ollama tools format:",
        JSON.stringify(ollamaTools, null, 2)
      );

      // Make the initial chat request
      let response = await this.ollamaService.chat(workingMessages, {
        model,
        tools: ollamaTools,
        ...options,
      });

      console.log("🔍 Ollama response:", JSON.stringify(response, null, 2));

      // Handle tool calls if present
      if (
        response.message.tool_calls &&
        response.message.tool_calls.length > 0
      ) {
        console.log("🔧 Tool calls detected:", response.message.tool_calls);
        const context = await getAppStateContext({}, {});

        // Add the assistant's response with tool calls to the conversation
        workingMessages.push(response.message);

        // Execute each tool call
        for (const toolCall of response.message.tool_calls) {
          console.log("🔧 Executing tool call:", toolCall);

          const tool = mcpTools.find((t) => t.name === toolCall.function.name);
          if (tool) {
            try {
              // Parse arguments if they're a string
              let args = toolCall.function.arguments;
              if (typeof args === "string") {
                try {
                  args = JSON.parse(args);
                } catch {
                  console.error(
                    `Failed to parse tool arguments for ${toolCall.function.name}:`,
                    args
                  );
                  args = {};
                }
              }

              console.log("🔧 Tool arguments:", args);

              const result = await tool.handler(args, context);

              console.log("🔧 Tool result:", result);

              // Safely extract content from the result
              const content = this.extractToolResultContent(
                result,
                toolCall.function.name
              );

              // Add tool result as a message with tool_call_id (Ollama format)
              workingMessages.push({
                role: "tool",
                content,
                tool_call_id: toolCall.id,
              });
            } catch (error) {
              const errorMessage = `Error executing tool ${
                toolCall.function.name
              }: ${error instanceof Error ? error.message : "Unknown error"}`;
              console.error(errorMessage, error);
              workingMessages.push({
                role: "tool",
                content: errorMessage,
                tool_call_id: toolCall.id,
              });
            }
          } else {
            const errorMessage = `Tool ${toolCall.function.name} not found`;
            console.error(errorMessage);
            workingMessages.push({
              role: "tool",
              content: errorMessage,
              tool_call_id: toolCall.id,
            });
          }
        }

        // Handle tool calls in the response
        if (
          response.message.tool_calls &&
          response.message.tool_calls.length > 0
        ) {
          const toolResults = [];

          for (const toolCall of response.message.tool_calls) {
            const tool = mcpTools.find(
              (t) => t.name === toolCall.function.name
            );
            if (tool) {
              try {
                const args = JSON.parse(
                  toolCall.function.arguments as unknown as string
                );
                const context = await getAppStateContext(args, {});
                const result = await tool.handler(args, context);

                toolResults.push({
                  tool_call_id: toolCall.id,
                  content: result.success
                    ? result.message || "Success"
                    : result.error || "Error",
                });
              } catch (error) {
                toolResults.push({
                  tool_call_id: toolCall.id,
                  content: `Error executing tool ${toolCall.function.name}: ${error}`,
                });
              }
            }
          }

          // Add tool results to the response
          response.message.content +=
            "\n\nTool Results:\n" +
            toolResults.map((r) => r.content).join("\n");
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
          message: `Ollama chat failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        id: request.id,
      };
    }
  }
}
