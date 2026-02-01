export function buildMetadataPrompt(serverInfo: {
  name: string;
  tools: Array<{ name: string; description?: string }>;
  resources: Array<{ name: string; uri: string; description?: string }>;
  prompts: Array<{ name: string; description?: string }>;
}): string {
  const toolsList = serverInfo.tools
    .map((t) => `  - ${t.name}${t.description ? `: ${t.description}` : ''}`)
    .join('\n');

  const resourcesList = serverInfo.resources
    .map(
      (r) =>
        `  - ${r.name} (${r.uri})${r.description ? `: ${r.description}` : ''}`,
    )
    .join('\n');

  const promptsList = serverInfo.prompts
    .map((p) => `  - ${p.name}${p.description ? `: ${p.description}` : ''}`)
    .join('\n');

  return `You are analyzing an MCP (Model Context Protocol) server to generate metadata for an AI skill file.

This skill file will be used by AI agents to understand when and how to use this MCP server. The metadata should help AI agents know:
1. What this MCP server does
2. When they should use it (trigger conditions)
3. What specific capabilities it provides

Given the following MCP server information:

Server Name: ${serverInfo.name}

Tools:
${toolsList || '  (none)'}

Resources:
${resourcesList || '  (none)'}

Prompts:
${promptsList || '  (none)'}

Generate a skill metadata JSON with the following fields:

1. "name": A concise, human-readable name for the skill (e.g., "File System Operations", "Web Search")

2. "description": A clear 1-2 sentence description of what this MCP server does and its main purpose

3. "triggerConditions": An array of 3-5 conditions that describe when an AI should use this skill. Each condition should start with "When" and describe a specific user request or scenario. Be specific about the types of tasks this MCP handles.

4. "capabilities": An array of 3-6 specific capabilities this server provides. Each capability should be a short phrase describing what the user can do with this skill.

5. "usageExamples": An array of 2-3 example user requests that would trigger this skill. These should be realistic, natural language requests that a user might make.

IMPORTANT: Your response must be ONLY valid JSON, with no additional text, markdown formatting, or code blocks. The JSON should be parseable directly.

Example response format:
{"name":"Example Skill","description":"This is an example description.","triggerConditions":["When the user asks about X","When the user needs to Y"],"capabilities":["Do X","Handle Y","Process Z"],"usageExamples":["Help me with X","Can you Y?"]}`;
}

export function parseMetadataResponse(response: string): {
  name: string;
  description: string;
  triggerConditions: string[];
  capabilities: string[];
  usageExamples: string[];
} {
  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    return {
      name: String(parsed.name || 'Unknown Skill'),
      description: String(parsed.description || 'No description available'),
      triggerConditions: Array.isArray(parsed.triggerConditions)
        ? parsed.triggerConditions.map(String)
        : [],
      capabilities: Array.isArray(parsed.capabilities)
        ? parsed.capabilities.map(String)
        : [],
      usageExamples: Array.isArray(parsed.usageExamples)
        ? parsed.usageExamples.map(String)
        : [],
    };
  } catch (error) {
    throw new Error(`Failed to parse LLM response as JSON: ${error}`);
  }
}
