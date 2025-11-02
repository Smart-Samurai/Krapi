import axios, { AxiosInstance } from 'axios';

export type LlmProvider = 'openai' | 'lmstudio' | 'ollama';

export interface LlmConfig {
  provider: LlmProvider;
  endpoint: string; // e.g. https://api.openai.com/v1 or http://localhost:1234/v1 or http://localhost:11434
  apiKey?: string;  // required for OpenAI, optional for LM Studio
  model: string;    // e.g. gpt-4o-mini or local-model or llama3.1:8b
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string; // tool name for tool messages
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
    type?: string;
  }>;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  output: string;
}

export class LlmService {
  private static createClient(config: LlmConfig): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // OpenAI and LM Studio use Bearer token authentication
    if ((config.provider === 'openai' || config.provider === 'lmstudio') && config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    return axios.create({
      baseURL: config.endpoint,
      headers,
      timeout: 120000, // 2 minute timeout for long operations
    });
  }

  static async chatWithTools(
    config: LlmConfig,
    messages: ChatMessage[],
    tools: ToolSpec[]
  ): Promise<{ messages: ChatMessage[]; toolCalls: ToolCall[] | null }> {
    // OpenAI-compatible (includes LM Studio which uses OpenAI-compatible API)
    if (config.provider === 'openai' || config.provider === 'lmstudio') {
      return this.chatWithToolsOpenAICompatible(config, messages, tools);
    }

    // Ollama
    if (config.provider === 'ollama') {
      return this.chatWithToolsOllama(config, messages, tools);
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  private static async chatWithToolsOpenAICompatible(
    config: LlmConfig,
    messages: ChatMessage[],
    tools: ToolSpec[]
  ): Promise<{ messages: ChatMessage[]; toolCalls: ToolCall[] | null }> {
    const client = this.createClient(config);

    // Format messages for OpenAI-compatible API
    const formattedMessages = messages.map((msg) => {
      const formatted: any = {
        role: msg.role,
        content: msg.content,
      };
      if (msg.name) formatted.name = msg.name;
      if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
      return formatted;
    });

    // Format tools for OpenAI-compatible API
    const formattedTools = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    try {
      const response = await client.post('/chat/completions', {
        model: config.model,
        messages: formattedMessages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 4000,
      });

      const choice = response.data.choices?.[0];
      if (!choice) {
        throw new Error('No response from LLM');
      }

      const assistantMsg = choice.message;
      const content = assistantMsg.content || '';
      const toolCalls = assistantMsg.tool_calls?.map(
        (tc: {
          id: string;
          function: { name: string; arguments: string };
          type?: string;
        }) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        })
      ) || null;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content,
        ...(assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0
          ? {
              tool_calls: assistantMsg.tool_calls.map(
                (tc: {
                  id: string;
                  function: { name: string; arguments: string };
                  type?: string;
                }) => ({
                  id: tc.id,
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                  },
                  type: tc.type || 'function',
                })
              ),
            }
          : {}),
      };

      const outMessages: ChatMessage[] = [...messages, assistantMessage];

      return { messages: outMessages, toolCalls };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OpenAI-compatible API error: ${errorMessage}`);
    }
  }

  private static async chatWithToolsOllama(
    config: LlmConfig,
    messages: ChatMessage[],
    tools: ToolSpec[]
  ): Promise<{ messages: ChatMessage[]; toolCalls: ToolCall[] | null }> {
    const client = this.createClient(config);

    // Ollama supports OpenAI-compatible chat endpoint (if using newer Ollama)
    // Check if endpoint supports /v1/chat/completions
    try {
      // Try OpenAI-compatible endpoint first
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const formattedTools = tools.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      try {
        const response = await client.post('/v1/chat/completions', {
          model: config.model,
          messages: formattedMessages,
          tools: formattedTools.length > 0 ? formattedTools : undefined,
          tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
        });

        const choice = response.data.choices?.[0];
        if (choice) {
          const assistantMsg = choice.message;
          const content = assistantMsg.content || '';
          const toolCalls = assistantMsg.tool_calls?.map(
            (tc: {
              id: string;
              function: { name: string; arguments: string };
            }) => ({
              id: tc.id || `ollama-tool-${Date.now()}`,
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments || '{}'),
            })
          ) || null;

          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content,
            ...(assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0
              ? {
                  tool_calls: assistantMsg.tool_calls.map(
                    (tc: {
                      id: string;
                      function: { name: string; arguments: string };
                    }) => ({
                      id: tc.id || `ollama-tool-${Date.now()}`,
                      function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                      },
                      type: 'function',
                    })
                  ),
                }
              : {}),
          };

          const outMessages: ChatMessage[] = [...messages, assistantMessage];

          return { messages: outMessages, toolCalls };
        }
      } catch {
        // Fall through to legacy Ollama API
      }

      // Legacy Ollama API fallback
      const systemPrompt = this.buildOllamaSystemPrompt(tools);
      const conversationPrompt = this.buildOllamaPrompt(messages, tools);
      const fullPrompt = `${systemPrompt}\n\n${conversationPrompt}`;

      const response = await client.post('/api/generate', {
        model: config.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4000,
        },
      });

      const content: string = response.data.response || '';
      let toolCalls: ToolCall[] | null = null;

      // Try to parse tool calls from response
      try {
        // Look for JSON tool call format
        const jsonMatch = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed && parsed.name) {
            toolCalls = [
              {
                id: `ollama-tool-${Date.now()}`,
                name: parsed.name,
                arguments: parsed.arguments || {},
              },
            ];
          }
        } else {
          // Try direct JSON parse
          const parsed = JSON.parse(content.trim());
          if (parsed && parsed.tool && parsed.tool.name) {
            toolCalls = [
              {
                id: `ollama-tool-${Date.now()}`,
                name: parsed.tool.name,
                arguments: parsed.tool.arguments || {},
              },
            ];
          }
        }
      } catch {
        // Not a tool call, continue with normal response
      }

      const outMessages: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content },
      ];

      return { messages: outMessages, toolCalls };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Ollama API error: ${errorMessage}`);
    }
  }

  private static buildOllamaSystemPrompt(tools: ToolSpec[]): string {
    if (tools.length === 0) {
      return 'You are a helpful assistant that can manage databases and applications through KRAPI.';
    }

    const toolsList = tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`
      )
      .join('\n');

    return `You are a tool-using assistant that can manage databases and applications through KRAPI.

Available tools:
${toolsList}

When you need to use a tool, respond with a JSON object in this exact format:
<tool_call>
{
  "name": "tool_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
</tool_call>

Always use the <tool_call>...</tool_call> tags when calling tools. Otherwise, respond normally to the user.`;
  }

  private static buildOllamaPrompt(
    messages: ChatMessage[],
    tools: ToolSpec[]
  ): string {
    return messages
      .map((msg) => {
        if (msg.role === 'system') {
          return `SYSTEM: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `USER: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          return `ASSISTANT: ${msg.content}`;
        } else if (msg.role === 'tool') {
          return `TOOL RESULT (${msg.name || 'tool'}): ${msg.content}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  static appendToolResults(
    messages: ChatMessage[],
    results: ToolResult[]
  ): ChatMessage[] {
    const toolMsgs: ChatMessage[] = results.map((r) => ({
      role: 'tool',
      content: r.output,
      tool_call_id: r.tool_call_id,
    }));
    return [...messages, ...toolMsgs];
  }
}
