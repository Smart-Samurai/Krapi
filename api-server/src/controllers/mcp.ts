import express from "express";
import { McpServer } from "../services/mcp-server";
import { getAppStateContext } from "../services/mcp-tools";
import { OllamaMessage } from "../types/mcp";

// Global MCP server instance
let mcpServerInstance: McpServer | null = null;

/**
 * Get or create MCP server instance
 */
function getMcpServer(): McpServer {
  if (!mcpServerInstance) {
    mcpServerInstance = new McpServer();
  }
  return mcpServerInstance;
}

export class McpController {
  /**
   * Get MCP server information
   */
  static async getServerInfo(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const mcpServer = getMcpServer();
      const config = mcpServer.getConfig();
      const ollamaService = mcpServer.getOllamaService();

      const info = {
        server: config,
        enabled: mcpServer.isServerEnabled(),
        ollama: {
          baseUrl: ollamaService.getBaseUrl(),
          defaultModel: ollamaService.getDefaultModel(),
          healthy: await ollamaService.healthCheck(),
        },
      };

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * List available MCP tools
   */
  static async listTools(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const mcpServer = getMcpServer();
      const response = mcpServer.handleRequest({
        method: "tools/list",
        id: Date.now(),
      });

      res.json({
        success: true,
        data: (await response).result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Execute an MCP tool
   */
  static async callTool(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { name, arguments: args } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Tool name is required",
        });
        return;
      }

      const mcpServer = getMcpServer();
      const response = await (mcpServer as any).handleRequest({
        method: "tools/call",
        params: {
          name,
          arguments: args || {},
        },
        id: Date.now(),
      });

      if (response.error) {
        res.status(400).json({
          success: false,
          error: response.error.message,
          code: response.error.code,
        });
        return;
      }

      res.json({
        success: true,
        data: response.result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Chat with Ollama through MCP
   */
  static async ollamaChat(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      console.log("🔍 MCP Chat Request:", {
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });

      const {
        messages,
        model,
        tools = false,
        temperature = 0.7,
        max_tokens = 2000,
      } = req.body;

      if (!messages || !Array.isArray(messages)) {
        console.error("❌ Invalid messages format:", messages);
        res.status(400).json({
          success: false,
          error: "Messages array is required",
        });
        return;
      }

      // Convert frontend messages to OllamaMessage format
      const ollamaMessages: OllamaMessage[] = messages.map(
        (msg: any, index: number) => {
          // Validate message structure
          if (!msg || typeof msg !== "object") {
            throw new Error(`Invalid message format at index ${index}`);
          }
          if (!msg.role || !msg.content) {
            throw new Error(
              `Message at index ${index} must have role and content`
            );
          }

          return {
            role: msg.role as "system" | "user" | "assistant" | "tool",
            content: String(msg.content),
            tool_calls: msg.tool_calls || undefined,
          };
        }
      );

      console.log("🔍 Processed messages:", ollamaMessages.length);

      // Get the MCP server
      const mcpServer = getMcpServer();

      console.log("🔍 MCP Server status:", {
        enabled: mcpServer.isServerEnabled(),
        toolsEnabled: tools,
      });

      // Use MCP server for chat with tool support
      const response = await (mcpServer as any).handleRequest({
        method: "ollama/chat",
        params: {
          messages: ollamaMessages,
          model,
          tools,
          options: {
            temperature,
            max_tokens,
          },
        },
        id: Date.now(),
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log("✅ Ollama response received");

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("❌ MCP Chat Error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if this is a validation error (client-side error)
      if (
        errorMessage.includes("Invalid message format") ||
        errorMessage.includes("must have role and content") ||
        errorMessage.includes("Messages array is required")
      ) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
      } else {
        // Server-side error
        res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    }
  }

  /**
   * List available Ollama models
   */
  static async listModels(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const mcpServer = getMcpServer();
      const ollamaService = mcpServer.getOllamaService();

      const modelNames = await ollamaService.listModels();

      res.json({
        success: true,
        data: {
          models: modelNames,
          defaultModel: ollamaService.getDefaultModel(),
          baseUrl: ollamaService.getBaseUrl(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Pull an Ollama model
   */
  static async pullModel(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { model } = req.body;

      if (!model) {
        res.status(400).json({
          success: false,
          error: "Model name is required",
        });
        return;
      }

      const mcpServer = getMcpServer();
      const ollamaService = mcpServer.getOllamaService();

      const success = await ollamaService.pullModel(model);

      if (!success) {
        res.status(400).json({
          success: false,
          error: "Failed to pull model",
        });
        return;
      }

      res.json({
        success: true,
        data: { message: `Model ${model} pulled successfully` },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update Ollama configuration (URL, default model, etc.)
   */
  static async updateOllamaConfig(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { baseUrl, defaultModel } = req.body;

      if (!baseUrl) {
        res.status(400).json({
          success: false,
          error: "Base URL is required",
        });
        return;
      }

      const mcpServer = getMcpServer();
      const ollamaService = mcpServer.getOllamaService();

      // Update the Ollama service configuration
      ollamaService.updateConfig({ baseUrl, defaultModel });

      // Test the new configuration
      const isHealthy = await ollamaService.healthCheck();
      const models = await ollamaService.listModels().catch(() => []);

      res.json({
        success: true,
        data: {
          message: "Ollama configuration updated successfully",
          baseUrl,
          defaultModel: defaultModel || ollamaService.getDefaultModel(),
          healthy: isHealthy,
          availableModels: models,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get current application state context
   */
  static async getAppState(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const context = await getAppStateContext({}, {});

      res.json({
        success: true,
        data: context,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Generate a simple text completion
   */
  static async generate(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { prompt, model, temperature, max_tokens } = req.body;

      if (!prompt) {
        res.status(400).json({
          success: false,
          error: "Prompt is required",
        });
        return;
      }

      const mcpServer = getMcpServer();
      const ollamaService = mcpServer.getOllamaService();

      const result = await ollamaService.generate(prompt, {
        model,
        temperature,
        max_tokens,
      });

      res.json({
        success: true,
        data: {
          text: result,
          prompt,
          model: model || ollamaService.getDefaultModel(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Health check for both MCP and Ollama
   */
  static async healthCheck(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const mcpServer = getMcpServer();
      const ollamaService = mcpServer.getOllamaService();

      const [ollamaHealthy, models] = await Promise.all([
        ollamaService.healthCheck(),
        ollamaService.listModels().catch(() => []),
      ]);

      res.json({
        success: true,
        data: {
          mcp: {
            enabled: mcpServer.isServerEnabled(),
            server: mcpServer.getConfig(),
          },
          ollama: {
            healthy: ollamaHealthy,
            baseUrl: ollamaService.getBaseUrl(),
            defaultModel: ollamaService.getDefaultModel(),
            availableModels: models,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

/**
 * Initialize MCP server
 */
export async function initializeMcpServer(): Promise<void> {
  try {
    const mcpServer = getMcpServer();
    if (mcpServer.isServerEnabled()) {
      console.log("📖 MCP server initialized (HTTP-only mode)");
      const ollamaService = mcpServer.getOllamaService();
      if (await ollamaService.healthCheck()) {
        const models = await ollamaService.listModels();
        console.log(`🧠 Available Ollama models: ${models.join(", ")}`);
      } else {
        console.warn("⚠️  Ollama is not available. AI features may not work.");
      }
    } else {
      console.log("📖 MCP server is disabled");
    }
  } catch (error) {
    console.error("Failed to initialize MCP server:", error);
  }
}

/**
 * Shutdown MCP server
 */
export async function shutdownMcpServer(): Promise<void> {
  if (mcpServerInstance) {
    console.log("📖 MCP server shutdown");
    mcpServerInstance = null;
  }
}
