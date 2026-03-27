import { readFileSync, existsSync } from 'node:fs';
import type { MCPConfigFile, MCPServerConfig } from './types.ts';

export class ConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigParseError';
  }
}

export function parseConfigFile(filePath: string): MCPConfigFile {
  if (!existsSync(filePath)) {
    throw new ConfigParseError(`Config file not found: ${filePath}`);
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new ConfigParseError(
      `Failed to read config file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ConfigParseError(
      `Invalid JSON in config file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ConfigParseError('Config file must contain a JSON object');
  }

  const config = parsed as Record<string, unknown>;

  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    throw new ConfigParseError('Config file must have a "mcpServers" object');
  }

  const mcpServers = config.mcpServers as Record<string, unknown>;
  const validatedServers: Record<string, MCPServerConfig> = {};

  for (const [name, serverConfig] of Object.entries(mcpServers)) {
    if (!serverConfig || typeof serverConfig !== 'object') {
      throw new ConfigParseError(
        `Invalid config for server "${name}": must be an object`,
      );
    }

    const sc = serverConfig as Record<string, unknown>;

    // Check for stdio config
    if ('command' in sc) {
      if (typeof sc.command !== 'string') {
        throw new ConfigParseError(
          `Invalid config for server "${name}": command must be a string`,
        );
      }
      validatedServers[name] = {
        command: sc.command,
        args: Array.isArray(sc.args) ? sc.args.map(String) : undefined,
        env:
          sc.env && typeof sc.env === 'object'
            ? (sc.env as Record<string, string>)
            : undefined,
      };
      continue;
    }

    // Check for SSE or WebSocket config
    if ('url' in sc) {
      if (typeof sc.url !== 'string') {
        throw new ConfigParseError(
          `Invalid config for server "${name}": url must be a string`,
        );
      }

      const transport = sc.transport;
      if (transport === 'sse') {
        validatedServers[name] = {
          url: sc.url,
          transport: 'sse',
          headers:
            sc.headers && typeof sc.headers === 'object'
              ? (sc.headers as Record<string, string>)
              : undefined,
        };
        continue;
      }

      if (transport === 'websocket') {
        validatedServers[name] = {
          url: sc.url,
          transport: 'websocket',
          headers:
            sc.headers && typeof sc.headers === 'object'
              ? (sc.headers as Record<string, string>)
              : undefined,
        };
        continue;
      }

      if (transport === 'streamable-http') {
        validatedServers[name] = {
          url: sc.url,
          transport: 'streamable-http',
          headers:
            sc.headers && typeof sc.headers === 'object'
              ? (sc.headers as Record<string, string>)
              : undefined,
        };
        continue;
      }

      throw new ConfigParseError(
        `Invalid config for server "${name}": url-based config requires transport to be "sse", "websocket", or "streamable-http"`,
      );
    }

    throw new ConfigParseError(
      `Invalid config for server "${name}": must have either "command" (stdio) or "url" with "transport"`,
    );
  }

  return { mcpServers: validatedServers };
}
