import OpenAI from 'openai';
import { buildMetadataPrompt, parseMetadataResponse } from './prompts.ts';
import type { LLMClient, LLMClientOptions, SkillMetadata } from './types.ts';

export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(options: LLMClientOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });
    this.model = options.model || 'gpt-4o';
  }

  async generateMetadata(serverInfo: {
    name: string;
    tools: Array<{ name: string; description?: string }>;
    resources: Array<{ name: string; uri: string; description?: string }>;
    prompts: Array<{ name: string; description?: string }>;
  }): Promise<SkillMetadata> {
    const prompt = buildMetadataPrompt(serverInfo);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return parseMetadataResponse(content);
  }
}
