import type {
  Tool,
  Resource,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPServerConfig } from '../config/types.ts';

export interface MCPServerInfo {
  name: string;
  config: MCPServerConfig;
  tools: Tool[];
  resources: Resource[];
  prompts: Prompt[];
  serverInfo?: {
    name: string;
    version: string;
  };
}

export type { Tool, Resource, Prompt };
