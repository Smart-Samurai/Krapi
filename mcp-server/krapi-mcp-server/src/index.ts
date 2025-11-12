import 'dotenv/config';
import { KrapiSDK } from '@smartsamurai/krapi-sdk';
import * as mcp from '@modelcontextprotocol/sdk';
import { z } from 'zod';

const API_BASE_URL = process.env.KRAPI_BASE_URL || 'http://localhost:3470';
const API_KEY = process.env.KRAPI_API_KEY || '';

function createClient(): KrapiSDK {
  return new KrapiSDK({ baseUrl: API_BASE_URL, apiKey: API_KEY });
}

// Zod schemas for tool inputs
const createProjectInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  project_url: z.string().url().optional(),
});

const createCollectionInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        required: z.boolean().optional(),
        unique: z.boolean().optional(),
        indexed: z.boolean().optional(),
      })
    )
    .default([]),
});

const createDocumentInput = z.object({
  projectId: z.string().min(1),
  collectionId: z.string().min(1),
  data: z.record(z.any()),
});

const queryDocumentsInput = z.object({
  projectId: z.string().min(1),
  collectionId: z.string().min(1),
  search: z.string().optional(),
  limit: z.number().int().positive().max(500).default(50),
  page: z.number().int().positive().default(1),
});

const createApiKeyInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  expires_at: z.string().optional(),
});

const sendEmailInput = z.object({
  projectId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

async function main() {
  const server = new mcp.McpServer({ name: 'krapi-mcp' });

  // Tools
  server.tool(new mcp.Tool('create_project', 'Create a new KRAPI project', async (req: any) => {
    const input = createProjectInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.projects.create({
      name: input.name,
      description: input.description,
      project_url: input.project_url,
    } as any);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to create project');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  server.tool(new mcp.Tool('create_collection', 'Create a collection in a project', async (req: any) => {
    const input = createCollectionInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.collections.create(input.projectId, {
      name: input.name,
      description: input.description,
      fields: input.fields as any,
    } as any);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to create collection');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  server.tool(new mcp.Tool('create_document', 'Create a document in a collection', async (req: any) => {
    const input = createDocumentInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.documents.create(input.projectId, input.collectionId, input.data);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to create document');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  server.tool(new mcp.Tool('query_documents', 'List/search documents in a collection', async (req: any) => {
    const input = queryDocumentsInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.documents.getAll(input.projectId, input.collectionId, {
      search: input.search,
      limit: input.limit,
      page: input.page,
    } as any);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to query documents');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  server.tool(new mcp.Tool('create_project_api_key', 'Create an API key for a project', async (req: any) => {
    const input = createApiKeyInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.apiKeys.create(input.projectId, {
      name: input.name,
      scopes: input.scopes,
      expires_at: input.expires_at,
    } as any);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to create API key');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  server.tool(new mcp.Tool('send_email', 'Send an email from a project', async (req: any) => {
    const input = sendEmailInput.parse(req.params?.arguments ?? {});
    const client = createClient();
    const res = await client.email.send(input.projectId, {
      to: input.to,
      subject: input.subject,
      body: input.body,
    } as any);
    if (!res.success) throw new mcp.McpError(res.error || 'Failed to send email');
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] } as any;
  }));

  // Server info
  server.setInfo({
    name: 'krapi-mcp',
    version: '0.1.0',
    description: 'KRAPI MCP server exposing database and project tools',
    tools: server.listTools(),
  } as any);

  // Start stdio server
  const { stdout, stderr } = await mcp.createStdioServer(server as any);
  stdout.on('error', () => process.exit(1));
  stderr.on('error', () => process.exit(1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});