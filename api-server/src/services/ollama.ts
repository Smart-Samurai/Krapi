import axios, { AxiosInstance } from "axios";
import {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaMessage,
  McpTool,
} from "../types/mcp";

export class OllamaService {
  private client: AxiosInstance;
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_DEFAULT_MODEL || "llama3.2:3b";
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || "5000"); // Reduced from 30000 to 5000

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Check if Ollama is available and responding
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/api/tags");
      return response.status === 200;
    } catch {
      // Don't log error details to reduce noise when Ollama is not available
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "Ollama health check failed - this is normal if Ollama is not installed"
        );
      }
      return false;
    }
  }

  /**
   * List all available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get("/api/tags");
      return (
        response.data.models?.map((model: { name: string }) => model.name) || []
      );
    } catch (error) {
      console.error("Failed to list Ollama models:", error);
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      // Ollama pull API expects the model name in the request body
      const response = await this.client.post("/api/pull", {
        name: modelName,
        stream: false,
      });

      // Check if the response indicates success
      if (response.status === 200) {
        console.log(`✅ Successfully pulled model: ${modelName}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      if (axios.isAxiosError(error)) {
        console.error(
          `Ollama API error: ${error.response?.data?.error || error.message}`
        );
      }
      return false;
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  /**
   * Generate a chat completion with tool support
   */
  async chat(
    messages: OllamaMessage[],
    options: {
      model?: string;
      tools?: McpTool[];
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
    } = {}
  ): Promise<OllamaChatResponse> {
    const model = options.model || this.defaultModel;

    // Ensure the model is available
    if (!(await this.isModelAvailable(model))) {
      throw new Error(
        `Model ${model} is not available. Available models: ${(
          await this.listModels()
        ).join(", ")}`
      );
    }

    const request: OllamaChatRequest = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        num_predict: options.max_tokens || 2000,
      },
    };

    // Add tools if provided and model supports them
    // Only certain models support tool calling (e.g., mistral, llama3.1)
    if (options.tools && options.tools.length > 0) {
      console.log("🔍 Ollama Service - Tools provided:", options.tools.length);
      console.log(
        "🔍 Ollama Service - Tool names:",
        options.tools.map((t) => t.name)
      );

      // Format tools for Ollama's expected format (official API)
      request.tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }));

      console.log(
        "🔍 Ollama Service - Formatted tools:",
        JSON.stringify(request.tools, null, 2)
      );
    } else {
      console.log("🔍 Ollama Service - No tools provided");
    }

    try {
      const response = await this.client.post("/api/chat", request);
      return response.data;
    } catch (error) {
      console.error("Ollama chat request failed:", error);
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw new Error(
            "Ollama is not running. Please start Ollama with: ollama serve"
          );
        }
        throw new Error(
          `Ollama request failed: ${
            error.response?.data?.error || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Generate a simple text completion
   */
  async generate(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<string> {
    const messages: OllamaMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await this.chat(messages, options);
    return response.message.content;
  }

  /**
   * Get model information
   */
  async getModelInfo(
    modelName: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.client.post("/api/show", { name: modelName });
      return response.data;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      const response = await this.client.delete("/api/delete", {
        data: { name: modelName },
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to delete model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get embedding for text
   */
  async getEmbedding(text: string, model?: string): Promise<number[] | null> {
    try {
      const response = await this.client.post("/api/embeddings", {
        model: model || this.defaultModel,
        prompt: text,
      });
      return response.data.embedding || null;
    } catch (error) {
      console.error("Failed to get embedding:", error);
      return null;
    }
  }

  /**
   * Get the default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Set the default model
   */
  setDefaultModel(modelName: string): void {
    this.defaultModel = modelName;
  }

  /**
   * Get Ollama base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Update Ollama configuration
   */
  updateConfig(config: { baseUrl?: string; defaultModel?: string }): void {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
      // Recreate the axios client with the new base URL
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }
  }
}
