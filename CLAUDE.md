# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

m2s (MCP to Skills) is a CLI tool that converts MCP (Model Context Protocol) server configurations into Skill files. It connects to MCP servers, extracts tool/resource/prompt metadata, uses LLM to generate human-readable descriptions, and outputs skill files that AI agents can use to invoke MCP tools.

## Commands

```bash
# Development (watch mode)
bun dev examples/shadcn.json --api-key <key> --base-url <url>

# Build for npm
bun run build

# Build cross-platform binaries
bun run build:binary

# Format code
bun run format

# Run directly
bun run src/index.ts <config.json> --api-key <key> [options]
```

## Architecture

```
src/
├── index.ts          # CLI entry point, orchestrates the flow
├── cli/args.ts       # CLI argument parsing
├── config/           # MCP config file parsing (Claude Desktop format)
├── mcp/client.ts     # MCP SDK wrapper (connects, fetches tools/resources/prompts)
├── llm/              # LLM integration for metadata generation
│   ├── client.ts     # Factory function (auto-detects Anthropic vs OpenAI)
│   ├── anthropic.ts  # Anthropic API client
│   ├── openai.ts     # OpenAI-compatible API client
│   └── prompts.ts    # Prompt templates for metadata generation
├── generator/skill.ts # Generates SKILL.md, call.mjs
└── utils/logger.ts   # Logging utilities
```

## Data Flow

1. **Parse config** → Read MCP server configs (stdio/SSE/WebSocket)
2. **Connect MCP** → Use MCP SDK to connect and list tools/resources/prompts
3. **Generate metadata** → Call LLM to create descriptions and trigger conditions
4. **Output files** → Generate `skills/{name}/SKILL.md`, `call.mjs`

## Output Structure

Each MCP server generates a skill folder:
```
skills/{server-name}/
├── SKILL.md    # YAML frontmatter + markdown documentation
└── call.mjs    # Node.js script that calls MCP tools (executable)
```

AI agents invoke tools via: `node ./.claude/skills/{name}/call.mjs <tool> '<json_params>'`

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP client for connecting to servers
- `@anthropic-ai/sdk` - Anthropic API for metadata generation
- `openai` - OpenAI-compatible API support
