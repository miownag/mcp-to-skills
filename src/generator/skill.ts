import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import type { MCPServerConfig } from '../config/types.ts';
import { isSSEConfig, isStdioConfig } from '../config/types.ts';
import type { SkillMetadata } from '../llm/types.ts';
import type { Prompt, Resource, Tool } from '../mcp/types.ts';

export interface SkillFile {
  serverName: string;
  metadata: SkillMetadata;
  mcpConfig: MCPServerConfig;
  tools: Tool[];
  resources: Resource[];
  prompts: Prompt[];
}

export function generateSkillMarkdown(skill: SkillFile): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push(`name: ${skill.serverName}`);
  lines.push(`description: ${skill.metadata.description}`);
  lines.push('---');
  lines.push('');

  // Header
  lines.push(`# ${skill.metadata.name}`);
  lines.push('');

  // When to use
  lines.push('## When to use this skill');
  lines.push('');
  for (const condition of skill.metadata.triggerConditions) {
    lines.push(`- ${condition}`);
  }
  lines.push('');

  // Capabilities
  if (skill.metadata.capabilities.length > 0) {
    lines.push('## Capabilities');
    lines.push('');
    for (const capability of skill.metadata.capabilities) {
      lines.push(`- ${capability}`);
    }
    lines.push('');
  }

  // Usage examples
  if (skill.metadata.usageExamples.length > 0) {
    lines.push('## Example Requests');
    lines.push('');
    for (const example of skill.metadata.usageExamples) {
      lines.push(`- "${example}"`);
    }
    lines.push('');
  }

  // Instructions - How to use
  lines.push('## How to use');
  lines.push('');
  lines.push(
    '> **IMPORTANT**: Do NOT read or analyze the `call.mjs` script. It is a bundled file and very large. Just execute it directly with the commands below.',
  );
  lines.push('');
  lines.push('Run the `call.mjs` script in this directory to call MCP tools:');
  lines.push('');
  lines.push('```bash');
  lines.push(
    `node ./.claude/skills/${skill.serverName}/call.mjs <tool_name> '<json_params>'`,
  );
  lines.push('```');
  lines.push('');
  lines.push('**Example:**');
  lines.push('');
  if (skill.tools.length > 0) {
    const firstTool = skill.tools[0];
    lines.push('```bash');
    lines.push(
      `node ./.claude/skills/${skill.serverName}/call.mjs ${firstTool?.name} '{}'`,
    );
    lines.push('```');
  }
  lines.push('');

  // Available Tools
  if (skill.tools.length > 0) {
    lines.push('## Available Tools');
    lines.push('');

    for (const tool of skill.tools) {
      lines.push(`### \`${tool.name}\``);
      lines.push('');
      if (tool.description) {
        lines.push(tool.description);
        lines.push('');
      }
      lines.push('**Usage:**');
      lines.push('');
      lines.push('```bash');
      lines.push(
        `node ./.claude/skills/${skill.serverName}/call.mjs ${tool.name} '<params>'`,
      );
      lines.push('```');
      lines.push('');
      lines.push('**Parameters:**');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(tool.inputSchema, null, 2));
      lines.push('```');
      lines.push('');
    }
  }

  // Available Resources
  if (skill.resources.length > 0) {
    lines.push('## Available Resources');
    lines.push('');
    for (const resource of skill.resources) {
      let line = `- **${resource.name}** (\`${resource.uri}\`)`;
      if (resource.description) {
        line += `: ${resource.description}`;
      }
      lines.push(line);
    }
    lines.push('');
  }

  // Available Prompts
  if (skill.prompts.length > 0) {
    lines.push('## Available Prompts');
    lines.push('');
    for (const prompt of skill.prompts) {
      lines.push(`### ${prompt.name}`);
      lines.push('');
      if (prompt.description) {
        lines.push(prompt.description);
        lines.push('');
      }
      if (prompt.arguments && prompt.arguments.length > 0) {
        const argNames = prompt.arguments.map((a) => a.name).join(', ');
        lines.push(`**Arguments:** ${argNames}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export async function generateCallMjs(skill: SkillFile): Promise<string> {
  const config = skill.mcpConfig;

  let transportSetup: string;

  if (isStdioConfig(config)) {
    const envSetup = config.env
      ? `env: { ...process.env, ${Object.entries(config.env)
          .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
          .join(', ')} }`
      : '';

    transportSetup = `
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  transport = new StdioClientTransport({
    command: ${JSON.stringify(config.command)},
    args: ${JSON.stringify(config.args || [])},
    ${envSetup}
  });`;
  } else if (isSSEConfig(config)) {
    transportSetup = `
  const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
  transport = new SSEClientTransport(new URL(${JSON.stringify(config.url)}));`;
  } else {
    const url = (config as { url: string }).url;
    transportSetup = `
  const { WebSocketClientTransport } = await import("@modelcontextprotocol/sdk/client/websocket.js");
  transport = new WebSocketClientTransport(new URL(${JSON.stringify(url)}));`;
  }

  const sourceCode = `/**
 * MCP Tool Caller for: ${skill.serverName}
 * Generated by m2s (MCP to Skills)
 */

const toolName = process.argv[2];
const paramsJson = process.argv[3] || "{}";

if (!toolName) {
  console.error("Usage: node call.mjs <tool_name> '<json_params>'");
  process.exit(1);
}

let params;
try {
  params = JSON.parse(paramsJson);
} catch (e) {
  console.error("Error: Invalid JSON params");
  console.error(e.message);
  process.exit(1);
}

async function main() {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");

  let transport;
${transportSetup}

  const client = new Client(
    { name: "m2s-caller", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: toolName,
      arguments: params,
    });

    // Extract text content from result
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === "text") {
          console.log(item.text);
        } else {
          console.log(JSON.stringify(item, null, 2));
        }
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("Error:", error.message || error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
`;

  // Bundle with esbuild
  const tempDir = join(tmpdir(), `m2s-${Date.now()}`);
  const tempFile = join(tempDir, 'call.mjs');

  try {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(tempFile, sourceCode, 'utf-8');

    const result = await build({
      entryPoints: [tempFile],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node18',
      write: false,
      minify: false,
      banner: {
        js: '#!/usr/bin/env node',
      },
      nodePaths: [join(import.meta.dirname, '../../node_modules')],
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      if (!result.outputFiles[0]) {
        throw new Error('esbuild produced empty output');
      }
      return result.outputFiles[0].text;
    }

    throw new Error('esbuild produced no output');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
