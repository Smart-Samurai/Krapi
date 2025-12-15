import { Request } from "express";

import { LlmConfig } from "./llm.service";
import { ToolContext } from "./tools.service";

/**
 * Extract LLM configuration from request body
 *
 * Validates and extracts LLM provider configuration from the request.
 *
 * @param {Request} req - Express request containing LLM config in body
 * @returns {LlmConfig} The LLM configuration
 * @throws {Error} If provider, endpoint, or model are missing
 *
 * @example
 * const config = getLlmConfig(req);
 * // { provider: 'openai', endpoint: 'https://api.openai.com', apiKey: 'key', model: 'gpt-4' }
 */
export function getLlmConfig(req: Request): LlmConfig {
  const { provider, endpoint, apiKey, model } = req.body as {
    provider: string;
    endpoint: string;
    apiKey?: string;
    model: string;
  };
  if (!provider || !endpoint || !model) {
    throw new Error("provider, endpoint and model are required");
  }
  const config: LlmConfig = {
    provider: provider as "openai" | "lmstudio" | "ollama",
    endpoint,
    model,
  };
  if (apiKey !== undefined) {
    config.apiKey = apiKey;
  }
  return config;
}

/**
 * Resolve tool execution context from request
 *
 * Extracts user and project information from the authenticated request
 * to create a ToolContext for MCP tool execution.
 *
 * @param {Request & { user?: { id: string } }} req - Express request with authenticated user
 * @param {'admin' | 'project'} scope - The scope of the operation
 * @param {string} [projectId] - Optional project ID for project-scoped operations
 * @returns {ToolContext} The resolved tool context
 *
 * @example
 * const ctx = resolveContext(req, 'project', 'project-uuid');
 */
export function resolveContext(
  req: Request & { user?: { id: string } },
  scope: "admin" | "project",
  projectId?: string
): ToolContext {
  const context: ToolContext = {
    scope,
  };
  if (projectId !== undefined) {
    context.projectId = projectId;
  }
  if (req.user?.id !== undefined) {
    context.userId = req.user.id;
  }
  return context;
}
