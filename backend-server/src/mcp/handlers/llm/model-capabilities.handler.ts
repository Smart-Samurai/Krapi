import axios from "axios";
import { Request, Response } from "express";

/**
 * Handler for checking model capabilities
 * POST /krapi/k1/mcp/model-capabilities
 */
export class ModelCapabilitiesHandler {
  async handle(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, endpoint, apiKey, model } = req.body as {
        provider: string;
        endpoint: string;
        apiKey?: string;
        model: string;
      };

      if (!provider || !endpoint || !model) {
        return res.status(400).json({
          success: false,
          error: 'provider, endpoint, and model are required',
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if ((provider === 'openai' || provider === 'lmstudio') && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      let supportsToolCalling = false;
      let supportsFunctionCalling = false;
      let details: Record<string, unknown> = {};

      // OpenAI-compatible (OpenAI, LM Studio)
      if (provider === 'openai' || provider === 'lmstudio') {
        try {
          // Test with a simple chat completion request with tools
          const testResponse = await axios.post(
            `${endpoint}/chat/completions`,
            {
              model,
              messages: [{ role: 'user', content: 'test' }],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'test_tool',
                    description: 'Test tool',
                    parameters: {
                      type: 'object',
                      properties: {},
                    },
                  },
                },
              ],
              max_tokens: 10,
            },
            {
              headers,
              timeout: 10000,
              validateStatus: (status: number) => status < 500, // Don't throw on 4xx
            }
          );

          // If we get a 200 response, the model supports tool calling
          if (testResponse.status === 200) {
            supportsToolCalling = true;
            supportsFunctionCalling = true;
          }

          // Try to get model details from models endpoint
          try {
            const modelsResponse = await axios.get(`${endpoint}/models`, {
              headers,
              timeout: 10000,
            });
            const modelInfo = (modelsResponse.data.data || []).find(
              (m: { id: string }) => m.id === model
            );
            if (modelInfo) {
              details = modelInfo;
            }
          } catch {
            // Ignore errors fetching model details
          }
        } catch (error: unknown) {
          // If the error is not about tool calling, we can still check model info
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (!errorMessage.includes('tool') && !errorMessage.includes('function')) {
            // Try to get model info anyway
            try {
              const modelsResponse = await axios.get(`${endpoint}/models`, {
                headers,
                timeout: 10000,
              });
              const modelInfo = (modelsResponse.data.data || []).find(
                (m: { id: string }) => m.id === model
              );
              if (modelInfo) {
                details = modelInfo;
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      // Ollama
      else if (provider === 'ollama') {
        try {
          // Try OpenAI-compatible endpoint first
          try {
            const testResponse = await axios.post(
              `${endpoint}/v1/chat/completions`,
              {
                model,
                messages: [{ role: 'user', content: 'test' }],
                tools: [
                  {
                    type: 'function',
                    function: {
                      name: 'test_tool',
                      description: 'Test tool',
                      parameters: {
                        type: 'object',
                        properties: {},
                      },
                    },
                  },
                ],
                max_tokens: 10,
              },
              {
                headers,
                timeout: 10000,
                validateStatus: (status: number) => status < 500,
              }
            );

            if (testResponse.status === 200) {
              supportsToolCalling = true;
              supportsFunctionCalling = true;
            }
          } catch {
            // Ollama models typically support tool calling if they're newer models
            // We'll mark as potentially supported
            supportsToolCalling = true;
          }

          // Try to get model info
          try {
            const response = await axios.get(`${endpoint}/api/show`, {
              params: { name: model },
              timeout: 10000,
            });
            if (response.data) {
              details = response.data;
            }
          } catch {
            // Ignore
          }
        } catch {
          // For Ollama, assume tool calling is supported for most models
          supportsToolCalling = true;
        }
      }

      return res.json({
        success: true,
        capabilities: {
          supportsToolCalling,
          supportsFunctionCalling,
          provider,
          model,
          details,
        },
      });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to check model capabilities',
      });
    }
  }
}

