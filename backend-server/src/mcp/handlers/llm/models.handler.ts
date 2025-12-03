import axios from "axios";
import { Request, Response } from "express";

/**
 * Handler for listing LLM models
 * POST /krapi/k1/mcp/models
 */
export class ModelsHandler {
  async handle(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, endpoint, apiKey } = req.body as {
        provider: string;
        endpoint: string;
        apiKey?: string;
      };

      if (!provider || !endpoint) {
        return res.status(400).json({
          success: false,
          error: 'provider and endpoint are required',
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if ((provider === 'openai' || provider === 'lmstudio') && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      let models: Array<{ id: string; name?: string; [key: string]: unknown }> = [];

      // OpenAI-compatible (OpenAI, LM Studio)
      if (provider === 'openai' || provider === 'lmstudio') {
        try {
          const response = await axios.get(`${endpoint}/models`, {
            headers,
            timeout: 10000,
          });
          models = (response.data.data || []).map((m: { id: string; [key: string]: unknown }) => {
            const model: { id: string; name: string; [key: string]: unknown } = {
              id: m.id,
              name: m.id,
            };
            // Copy other properties except id and name to avoid overwriting
            for (const [key, value] of Object.entries(m)) {
              if (key !== 'id' && key !== 'name') {
                model[key] = value;
              }
            }
            return model;
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return res.status(500).json({
            success: false,
            error: `Failed to fetch models: ${errorMessage}`,
          });
        }
      }
      // Ollama
      else if (provider === 'ollama') {
        try {
          // Try OpenAI-compatible endpoint first
          try {
            const response = await axios.get(`${endpoint}/v1/models`, {
              headers,
              timeout: 10000,
            });
            models = (response.data.data || []).map((m: { id: string; [key: string]: unknown }) => {
              const model: { id: string; name: string; [key: string]: unknown } = {
                id: m.id,
                name: m.id,
              };
              // Copy other properties except id and name to avoid overwriting
              for (const [key, value] of Object.entries(m)) {
                if (key !== 'id' && key !== 'name') {
                  model[key] = value;
                }
              }
              return model;
            });
          } catch {
            // Fall back to Ollama native API
            const response = await axios.get(`${endpoint}/api/tags`, {
              timeout: 10000,
            });
            models = (response.data.models || []).map((m: { name: string; [key: string]: unknown }) => {
              const model: { id: string; name: string; [key: string]: unknown } = {
                id: m.name,
                name: m.name,
              };
              // Copy other properties except id and name to avoid overwriting
              for (const [key, value] of Object.entries(m)) {
                if (key !== 'id' && key !== 'name') {
                  model[key] = value;
                }
              }
              return model;
            });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return res.status(500).json({
            success: false,
            error: `Failed to fetch models: ${errorMessage}`,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: `Unsupported provider: ${provider}`,
        });
      }

      return res.json({
        success: true,
        models,
      });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list models',
      });
    }
  }
}

