import Anthropic from '@anthropic-ai/sdk';
import { buildMetadataPrompt, parseMetadataResponse } from './prompts.ts';
import type { LLMClient, LLMClientOptions, SkillMetadata } from './types.ts';

export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(options: LLMClientOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
    this.model = options.model || 'claude-sonnet-4-5-20250929';
  }

  async generateMetadata(serverInfo: {
    name: string;
    tools: Array<{ name: string; description?: string }>;
    resources: Array<{ name: string; uri: string; description?: string }>;
    prompts: Array<{ name: string; description?: string }>;
  }): Promise<SkillMetadata> {
    const prompt = buildMetadataPrompt(serverInfo);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: Infinity,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return parseMetadataResponse(textContent.text);
  }
}
