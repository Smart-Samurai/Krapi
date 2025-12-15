declare module '@modelcontextprotocol/sdk' {
  export class McpServer {
    constructor(opts: { name: string });
    tool(tool: any): void;
    setInfo(info: any): void;
    listTools(): any[];
  }
  export class Tool {
    constructor(name: string, description: string, handler: (req: any) => Promise<any>);
  }
  export class McpError extends Error {}
  export function createStdioServer(server: any): Promise<{ stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream }>; 
}