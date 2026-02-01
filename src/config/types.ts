export interface StdioMCPConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SSEMCPConfig {
  url: string;
  transport: 'sse';
  headers?: Record<string, string>;
}

export interface WebSocketMCPConfig {
  url: string;
  transport: 'websocket';
  headers?: Record<string, string>;
}

export type MCPServerConfig =
  | StdioMCPConfig
  | SSEMCPConfig
  | WebSocketMCPConfig;

export interface MCPConfigFile {
  mcpServers: Record<string, MCPServerConfig>;
}

export function isStdioConfig(
  config: MCPServerConfig,
): config is StdioMCPConfig {
  return 'command' in config;
}

export function isSSEConfig(config: MCPServerConfig): config is SSEMCPConfig {
  return 'transport' in config && config.transport === 'sse';
}

export function isWebSocketConfig(
  config: MCPServerConfig,
): config is WebSocketMCPConfig {
  return 'transport' in config && config.transport === 'websocket';
}

export function getTransportType(
  config: MCPServerConfig,
): 'stdio' | 'sse' | 'websocket' {
  if (isStdioConfig(config)) return 'stdio';
  if (isSSEConfig(config)) return 'sse';
  return 'websocket';
}
