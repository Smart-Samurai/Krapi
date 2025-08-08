import axios from 'axios';

export type LlmProvider = 'openai' | 'ollama';

export interface LlmConfig {
  provider: LlmProvider;
  endpoint: string; // e.g. https://api.openai.com/v1 or http://localhost:11434
  apiKey?: string;  // required for OpenAI
  model: string;    // e.g. gpt-4o-mini or llama3.1:8b
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string; // tool name for tool messages
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: any; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ToolResult {
  tool_call_id: string;
  output: string;
}

export class LlmService {
  static async chatWithTools(config: LlmConfig, messages: ChatMessage[], tools: ToolSpec[]): Promise<{ messages: ChatMessage[]; toolCalls: ToolCall[] | null; }> {
    if (config.provider === 'openai') {
      const resp = await axios.post(`${config.endpoint}/chat/completions`, {
        model: config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content, name: m.name })),
        tools: tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
        tool_choice: 'auto'
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const choice = resp.data.choices?.[0];
      const assistantMsg = choice.message;
      const outMessages: ChatMessage[] = [...messages, { role: 'assistant', content: assistantMsg.content || '' }];
      const toolCalls = assistantMsg.tool_calls?.map((tc: any) => ({ id: tc.id, name: tc.function.name, arguments: JSON.parse(tc.function.arguments || '{}') })) || null;
      return { messages: outMessages, toolCalls };
    }

    // Basic Ollama support: instruct model to return JSON with tool name and args when calling tools
    const system = `You are a tool-using assistant. When a tool is needed, return a JSON object {"tool":{"name":"<tool>","arguments":{...}}} only. Otherwise, reply normally.`;
    const prompt = [system, ...messages.map(m => `${m.role.toUpperCase()}: ${m.content}`)].join('\n');
    const resp = await axios.post(`${config.endpoint}/api/generate`, {
      model: config.model,
      prompt,
      stream: false
    }, { headers: { 'Content-Type': 'application/json' } });
    const content: string = resp.data.response || '';
    let toolCalls: ToolCall[] | null = null;
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.tool && parsed.tool.name) {
        toolCalls = [{ id: 'ollama-tool-1', name: parsed.tool.name, arguments: parsed.tool.arguments || {} }];
      }
    } catch { /* not a tool call */ }
    const outMessages: ChatMessage[] = [...messages, { role: 'assistant', content }];
    return { messages: outMessages, toolCalls };
  }

  static appendToolResults(messages: ChatMessage[], results: ToolResult[]): ChatMessage[] {
    const toolMsgs: ChatMessage[] = results.map(r => ({ role: 'tool', content: r.output, tool_call_id: r.tool_call_id }));
    return [...messages, ...toolMsgs];
  }
}