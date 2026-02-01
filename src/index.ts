#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parseArgs, showHelp, showVersion, validateArgs } from './cli/args.ts';
import { getTransportType, parseConfigFile } from './config/index.ts';
import {
  generateCallMjs,
  generateSkillMarkdown,
  type SkillFile,
  sanitizeFilename,
} from './generator/index.ts';
import { createLLMClient, type LLMClient } from './llm/index.ts';
import { connectAndFetch } from './mcp/index.ts';
import { createLogger, getLogger, setDefaultLogger } from './utils/logger.ts';

interface ProcessResult {
  name: string;
  status: 'success' | 'failed';
  path?: string;
  error?: string;
}

async function processServer(
  name: string,
  config: Parameters<typeof connectAndFetch>[1],
  llmClient: LLMClient,
  outputDir: string,
  dryRun: boolean,
  timeout: number,
): Promise<ProcessResult> {
  const logger = getLogger();
  const transportType = getTransportType(config);

  logger.verbose(`Connecting via ${transportType}...`);

  try {
    // Connect and fetch MCP info
    const serverInfo = await connectAndFetch(name, config, timeout);

    logger.verbose(
      `Connected! Found ${serverInfo.tools.length} tools, ${serverInfo.resources.length} resources, ${serverInfo.prompts.length} prompts`,
    );

    // Generate metadata via LLM
    logger.verbose('Generating skill metadata via LLM...');

    const metadata = await llmClient.generateMetadata({
      name: serverInfo.name,
      tools: serverInfo.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      resources: serverInfo.resources.map((r) => ({
        name: r.name,
        uri: r.uri,
        description: r.description,
      })),
      prompts: serverInfo.prompts.map((p) => ({
        name: p.name,
        description: p.description,
      })),
    });

    // Generate skill file
    const skillFile: SkillFile = {
      serverName: name,
      metadata,
      mcpConfig: config,
      tools: serverInfo.tools,
      resources: serverInfo.resources,
      prompts: serverInfo.prompts,
    };

    const markdown = generateSkillMarkdown(skillFile);
    const callMjs = await generateCallMjs(skillFile);
    const skillDir = join(outputDir, sanitizeFilename(name));
    const skillPath = join(skillDir, 'SKILL.md');
    const callMjsPath = join(skillDir, 'call.mjs');

    if (dryRun) {
      logger.info(`[DRY RUN] Would write: ${skillPath}`);
      logger.info(`[DRY RUN] Would write: ${callMjsPath}`);
      console.log('\n--- Generated SKILL.md ---');
      console.log(markdown);
      console.log('--- End SKILL.md ---\n');
    } else {
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(skillPath, markdown, 'utf-8');
      writeFileSync(callMjsPath, callMjs, { mode: 0o755 });
      logger.verbose(`Writing ${skillPath}`);
      logger.verbose(`Writing ${callMjsPath}`);
    }

    return { name, status: 'success', path: skillDir };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { name, status: 'failed', error: errorMessage };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle help and version
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  // Validate arguments
  const validationError = validateArgs(args);
  if (validationError) {
    console.error(validationError);
    process.exit(1);
  }

  // Setup logger
  const logger = createLogger({ verbose: args.verbose });
  setDefaultLogger(logger);

  // Parse config file
  logger.info(`Reading config from ${args.configFile}`);

  const config = parseConfigFile(args.configFile);

  const serverNames = Object.keys(config.mcpServers);
  if (serverNames.length === 0) {
    logger.error('No MCP servers found in config file');
    process.exit(1);
  }

  logger.info(`Found ${serverNames.length} MCP server(s) to process`);

  // Create output directory
  const outputDir = resolve(args.output);
  if (!args.dryRun && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Create LLM client
  if (!args.apiKey) {
    logger.error('API key is required');
    process.exit(1);
  }

  const llmClient = createLLMClient({
    apiKey: args.apiKey,
    model: args.model,
    baseUrl: args.baseUrl,
    provider: args.provider,
  });

  // Process each server
  const results: ProcessResult[] = [];

  for (let i = 0; i < serverNames.length; i++) {
    const name = serverNames[i];
    const serverConfig = name ? config.mcpServers[name] : undefined;

    if (!name || !serverConfig) {
      continue;
    }

    logger.info(`\n[${i + 1}/${serverNames.length}] Processing "${name}"...`);

    const result = await processServer(
      name,
      serverConfig,
      llmClient,
      outputDir,
      args.dryRun,
      args.timeout,
    );

    if (result.status === 'success') {
      logger.success(`${name}`);
    } else {
      logger.error(`${name}: ${result.error}`);
      logger.info('Skipping...');
    }

    results.push(result);
  }

  // Print summary
  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  console.log('\n');
  logger.info('Complete!');
  logger.info(`  Successful: ${successful.length}`);
  logger.info(`  Failed: ${failed.length}`);

  if (successful.length > 0 && !args.dryRun) {
    console.log('\nGenerated skill files:');
    for (const result of successful) {
      console.log(`  ${result.path}`);
    }
  }

  // Exit with error code if any failed
  if (failed.length > 0 && successful.length === 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
