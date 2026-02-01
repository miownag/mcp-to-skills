export interface SkillMetadata {
  name: string;
  description: string;
  triggerConditions: string[];
  capabilities: string[];
  usageExamples: string[];
}

export interface LLMClient {
  generateMetadata(serverInfo: {
    name: string;
    tools: Array<{ name: string; description?: string }>;
    resources: Array<{ name: string; uri: string; description?: string }>;
    prompts: Array<{ name: string; description?: string }>;
  }): Promise<SkillMetadata>;
}

export interface LLMClientOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}
