export interface McpRequest {
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface McpResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: string | number;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (_args: any, _context: any) => Promise<McpToolResult>;
}

export interface McpToolCall {
  id: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface McpToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: McpToolCall[];
  tool_call_id?: string;
}

export interface OllamaToolFormat {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  tools?: OllamaToolFormat[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaChatResponse {
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface McpServerConfig {
  name: string;
  description: string;
  version: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface AppStateContext {
  contentItems: Array<{
    id: number;
    key: string;
    value: unknown;
    type: string;
    route_path: string;
    created_at: string;
    updated_at: string;
  }>;
  users: Array<{
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login?: string;
  }>;
  routes: Array<{
    id: number;
    path: string;
    name: string;
    description?: string;
    parent_id?: number;
    created_at: string;
  }>;
  schemas: Array<{
    id: number;
    name: string;
    description?: string;
    definition: unknown;
    created_at: string;
  }>;
  files: Array<{
    id: number;
    filename: string;
    original_name: string;
    size: number;
    mimetype: string;
    path: string;
    uploaded_by: number;
    created_at: string;
  }>;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  handler: (
    _args: Record<string, unknown>,
    _context: AppStateContext
  ) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    [key: string]: unknown;
  }>;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
