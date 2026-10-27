export type AgentConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export function agentConfig(): AgentConfig | null {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseURL: process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/inference/openai/v1',
    model: process.env.OPENCODE_MODEL ?? 'deepseek-v4.1-flash',
  };
}
