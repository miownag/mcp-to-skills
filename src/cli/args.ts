export interface CLIArgs {
  configFile: string;
  output: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  provider?: 'anthropic' | 'openai';
  timeout: number;
  verbose: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
}

const VERSION = '0.1.0';

const HELP_TEXT = `
m2s - Convert MCP servers to skills

Usage:
  m2s <config-file> [options]

Arguments:
  config-file              Path to MCP configuration file (JSON)

Options:
  -o, --output <dir>       Output directory for skill files (default: "./skills")

  LLM Configuration:
  --model <model>          LLM model to use (default: claude-sonnet-4-5-20250929)
  --api-key <key>          API key for LLM service (env: M2S_API_KEY)
  --base-url <url>         Base URL for OpenAI-compatible API (env: M2S_BASE_URL)
  --provider <name>        LLM provider: "anthropic" | "openai" (default: auto-detect)

  Processing Options:
  --timeout <ms>           Connection timeout per MCP server (default: 30000)

  Output Options:
  --verbose                Enable verbose logging
  --dry-run                Preview generated skills without writing files

  Help:
  -h, --help               Show help message
  -v, --version            Show version number

Examples:
  m2s ./claude_desktop_config.json
  m2s ./config.json -o ./my-skills
  m2s ./config.json --base-url https://api.example.com/v1 --api-key sk-xxx
  m2s ./config.json --dry-run --verbose
`.trim();

export function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    configFile: '',
    output: './skills',
    timeout: 30000,
    verbose: false,
    dryRun: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      i++;
      continue;
    }

    if (arg === '-v' || arg === '--version') {
      result.version = true;
      i++;
      continue;
    }

    if (arg === '-o' || arg === '--output') {
      result.output = args[++i] ?? './skills';
      i++;
      continue;
    }

    if (arg === '--model') {
      result.model = args[++i];
      i++;
      continue;
    }

    if (arg === '--api-key') {
      result.apiKey = args[++i];
      i++;
      continue;
    }

    if (arg === '--base-url') {
      result.baseUrl = args[++i];
      i++;
      continue;
    }

    if (arg === '--provider') {
      const provider = args[++i];
      if (provider === 'anthropic' || provider === 'openai') {
        result.provider = provider;
      }
      i++;
      continue;
    }

    if (arg === '--timeout') {
      result.timeout = Number.parseInt(args[++i] ?? '30000', 10);
      i++;
      continue;
    }

    if (arg === '--verbose') {
      result.verbose = true;
      i++;
      continue;
    }

    if (arg === '--dry-run') {
      result.dryRun = true;
      i++;
      continue;
    }

    // Positional argument (config file)
    if (!arg?.startsWith('-') && !result.configFile) {
      result.configFile = arg ?? '';
    }

    i++;
  }

  // Read from environment variables if not provided
  if (!result.apiKey) {
    result.apiKey = process.env.M2S_API_KEY;
  }
  if (!result.baseUrl) {
    result.baseUrl = process.env.M2S_BASE_URL;
  }

  return result;
}

export function showHelp(): void {
  console.log(HELP_TEXT);
}

export function showVersion(): void {
  console.log(`m2s v${VERSION}`);
}

export function validateArgs(args: CLIArgs): string | null {
  if (args.help || args.version) {
    return null;
  }

  if (!args.configFile) {
    return "Error: Config file is required\n\nUsage: m2s <config-file> [options]\nRun 'm2s --help' for more information.";
  }

  if (!args.apiKey) {
    return 'Error: API key is required. Provide via --api-key or M2S_API_KEY environment variable.';
  }

  return null;
}
