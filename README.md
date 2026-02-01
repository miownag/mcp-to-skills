# m2s (MCP to Skills)

Convert MCP servers to Skills files to save tokens.

## What is this?

m2s is a CLI tool that converts MCP (Model Context Protocol) server configurations into Skill files. These Skill files contain lightweight metadata that helps AI agents understand when and how to use each MCP server, without loading the full MCP configuration upfront.

**Benefits:**
- Save tokens by loading only metadata initially
- AI agents can decide when to invoke MCP based on metadata
- Same effect as direct MCP configuration, but more efficient

## Installation

### From npm

```bash
npm install -g mcp-to-skills
```

### From binary

Download the appropriate binary for your platform from the releases page.

### From source

```bash
git clone https://github.com/user/mcp-to-skills.git
cd mcp-to-skills
bun install
bun run build
```

## Usage

```bash
m2s <config-file> [options]
```

### Arguments

- `config-file` - Path to MCP configuration file (Claude Desktop format)

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory for skill files | `./skills` |
| `--model <model>` | LLM model to use | `claude-sonnet-4-5-20250929` |
| `--api-key <key>` | API key for LLM service | `M2S_API_KEY` env var |
| `--base-url <url>` | Base URL for OpenAI-compatible API | `M2S_BASE_URL` env var |
| `--provider <name>` | LLM provider: `anthropic` or `openai` | auto-detect |
| `--timeout <ms>` | Connection timeout per MCP server | `30000` |
| `--verbose` | Enable verbose logging | |
| `--dry-run` | Preview generated skills without writing | |
| `-h, --help` | Show help message | |
| `-v, --version` | Show version number | |

### Examples

```bash
# Basic usage with Anthropic API
m2s ./claude_desktop_config.json --api-key sk-ant-xxx

# Custom output directory
m2s ./config.json -o ./my-skills --api-key sk-ant-xxx

# Using OpenAI-compatible API
m2s ./config.json --base-url https://api.openai.com/v1 --api-key sk-xxx

# Dry run to preview
m2s ./config.json --dry-run --verbose --api-key sk-ant-xxx
```

## Input Format

m2s accepts the standard Claude Desktop MCP configuration format:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      "env": {
        "SOME_VAR": "value"
      }
    },
    "remote-sse": {
      "url": "https://example.com/sse",
      "transport": "sse"
    },
    "remote-ws": {
      "url": "wss://example.com/ws",
      "transport": "websocket"
    }
  }
}
```

## Output Format

Each MCP server generates a Markdown skill file with:

- **Description**: What the MCP server does
- **When to Use**: Trigger conditions for AI agents
- **Capabilities**: Specific capabilities provided
- **Example Requests**: Sample user requests
- **MCP Configuration**: Full config for runtime connection
- **Available Tools**: Tool names, descriptions, and input schemas

## Supported Transports

- **stdio**: Local process via stdin/stdout
- **SSE**: HTTP Server-Sent Events
- **WebSocket**: WebSocket connections

## License

MIT
