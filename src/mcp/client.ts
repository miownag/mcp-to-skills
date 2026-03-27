import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  isStdioConfig,
  isSSEConfig,
  isWebSocketConfig,
  isStreamableHttpConfig,
  type MCPServerConfig,
  type StdioMCPConfig,
  type SSEMCPConfig,
  type WebSocketMCPConfig,
  type StreamableHttpMCPConfig,
} from '../config/types.ts';
import type { MCPServerInfo, Tool, Resource, Prompt } from './types.ts';

export class MCPConnectionError extends Error {
  constructor(
    public serverName: string,
    message: string,
    cause?: Error,
  ) {
    super(`Failed to connect to MCP server "${serverName}": ${message}`);
    this.name = 'MCPConnectionError';
    this.cause = cause;
  }
}

interface TransportResult {
  transport:
    | StdioClientTransport
    | SSEClientTransport
    | WebSocketClientTransport
    | StreamableHTTPClientTransport;
  cleanup?: () => void;
}

function createStdioTransport(config: StdioMCPConfig): TransportResult {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env ? { ...process.env, ...config.env } as Record<string, string>: undefined,
  });
  return { transport };
}

function createSSETransport(config: SSEMCPConfig): TransportResult {
  const transport = new SSEClientTransport(new URL(config.url));
  return { transport };
}

function createWebSocketTransport(config: WebSocketMCPConfig): TransportResult {
  const transport = new WebSocketClientTransport(new URL(config.url));
  return { transport };
}

function createStreamableHttpTransport(
  config: StreamableHttpMCPConfig,
): TransportResult {
  const transport = new StreamableHTTPClientTransport(new URL(config.url));
  return { transport };
}

function createTransport(config: MCPServerConfig): TransportResult {
  if (isStdioConfig(config)) {
    return createStdioTransport(config);
  }
  if (isSSEConfig(config)) {
    return createSSETransport(config);
  }
  if (isWebSocketConfig(config)) {
    return createWebSocketTransport(config);
  }
  if (isStreamableHttpConfig(config)) {
    return createStreamableHttpTransport(config);
  }
  throw new Error('Unknown transport type');
}

export async function connectAndFetch(
  name: string,
  config: MCPServerConfig,
  timeout: number = 30000,
): Promise<MCPServerInfo> {
  const client = new Client(
    {
      name: 'm2s',
      version: '0.1.0',
    },
    {
      capabilities: {},
    },
  );

  const { transport, cleanup } = createTransport(config);

  try {
    // Connect with timeout
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Connection timeout after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);

    // Fetch tools, resources, and prompts
    const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
      client.listTools().catch(() => ({ tools: [] as Tool[] })),
      client.listResources().catch(() => ({ resources: [] as Resource[] })),
      client.listPrompts().catch(() => ({ prompts: [] as Prompt[] })),
    ]);

    const serverInfo = client.getServerVersion();

    return {
      name,
      config,
      tools: toolsResult.tools,
      resources: resourcesResult.resources,
      prompts: promptsResult.prompts,
      serverInfo: serverInfo
        ? {
            name: serverInfo.name,
            version: serverInfo.version,
          }
        : undefined,
    };
  } catch (error) {
    throw new MCPConnectionError(
      name,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
    );
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
    cleanup?.();
  }
}
