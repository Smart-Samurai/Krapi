import axios, { AxiosInstance } from "axios";
import {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaMessage,
} from "../types/mcp";

// Node.js types
declare global {
  namespace NodeJS {
    interface Timeout {}
  }
}

export interface OllamaModel {
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

export interface OllamaManagerConfig {
  baseUrl: string;
  defaultModel: string;
  keepAlive: boolean;
  maxConcurrentModels: number;
}

export class OllamaManager {
  private client: AxiosInstance;
  private config: OllamaManagerConfig;
  private loadedModels: Set<string> = new Set();
  private currentModel: string | null = null;
  private isHealthy: boolean = false;
  private healthCheckInterval: any = null;

  constructor(config: OllamaManagerConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Start health monitoring
    this.startHealthCheck();
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.warn("Ollama health check failed:", error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health check monitoring
   */
  public stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if Ollama is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get("/api/tags");
      this.isHealthy = response.status === 200;
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  /**
   * List all available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.client.get("/api/tags");
      return response.data.models || [];
    } catch (error) {
      console.error("Failed to list Ollama models:", error);
      return [];
    }
  }

  /**
   * Load a model and keep it in memory
   */
  async loadModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Loading model: ${modelName}`);

      // Check if model is already loaded
      if (this.loadedModels.has(modelName)) {
        console.log(`✅ Model ${modelName} already loaded`);
        this.currentModel = modelName;
        return true;
      }

      // Load the model
      const response = await this.client.post("/api/generate", {
        model: modelName,
        prompt: "test",
        stream: false,
        options: {
          num_predict: 1,
        },
      });

      if (response.status === 200) {
        this.loadedModels.add(modelName);
        this.currentModel = modelName;
        console.log(`✅ Model ${modelName} loaded successfully`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Unload a model from memory
   */
  async unloadModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Unloading model: ${modelName}`);

      // Note: Ollama doesn't have a direct unload API
      // We'll just remove it from our tracking
      this.loadedModels.delete(modelName);

      if (this.currentModel === modelName) {
        this.currentModel = null;
      }

      console.log(`✅ Model ${modelName} unloaded`);
      return true;
    } catch (error) {
      console.error(`Failed to unload model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Switching to model: ${modelName}`);

      // Load the new model
      const success = await this.loadModel(modelName);
      if (success) {
        this.currentModel = modelName;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to switch to model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get current model
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Get loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.loadedModels);
  }

  /**
   * Chat with the current model
   */
  async chat(
    messages: OllamaMessage[],
    options: {
      model?: string;
      tools?: any[];
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
    } = {}
  ): Promise<OllamaChatResponse> {
    const model =
      options.model || this.currentModel || this.config.defaultModel;

    // Ensure the model is loaded
    if (!this.loadedModels.has(model)) {
      await this.loadModel(model);
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

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      request.tools = options.tools;
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
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Pulling model: ${modelName}`);
      const response = await this.client.post("/api/pull", { name: modelName });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      console.log(`🔄 Deleting model: ${modelName}`);

      // Unload if currently loaded
      if (this.loadedModels.has(modelName)) {
        await this.unloadModel(modelName);
      }

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
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModel | null> {
    try {
      const response = await this.client.post("/api/show", { name: modelName });
      return response.data;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OllamaManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update client if baseUrl changed
    if (config.baseUrl && config.baseUrl !== this.client.defaults.baseURL) {
      this.client = axios.create({
        baseURL: config.baseUrl,
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaManagerConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopHealthCheck();
    this.loadedModels.clear();
    this.currentModel = null;
  }
}
