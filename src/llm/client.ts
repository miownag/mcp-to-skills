import { AnthropicClient } from './anthropic.ts';
import { OpenAIClient } from './openai.ts';
import type { LLMClient, LLMClientOptions } from './types.ts';

export type LLMProvider = 'anthropic' | 'openai';

export interface CreateLLMClientOptions extends LLMClientOptions {
  provider?: LLMProvider;
}

export function createLLMClient(options: CreateLLMClientOptions): LLMClient {
  const provider = options.provider || detectProvider(options);

  switch (provider) {
    case 'anthropic':
      return new AnthropicClient(options);
    case 'openai':
      return new OpenAIClient(options);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

function detectProvider(options: CreateLLMClientOptions): LLMProvider {
  // If baseUrl is provided, assume OpenAI-compatible API
  if (options.baseUrl) {
    return 'openai';
  }

  // Try to detect from model name
  if (options.model) {
    if (
      options.model.startsWith('claude') ||
      options.model.includes('anthropic')
    ) {
      return 'anthropic';
    }
    if (
      options.model.startsWith('gpt') ||
      options.model.startsWith('o1') ||
      options.model.startsWith('o3')
    ) {
      return 'openai';
    }
  }

  // Default to Anthropic
  return 'anthropic';
}

export * from './anthropic.ts';
export * from './openai.ts';
export * from './types.ts';
