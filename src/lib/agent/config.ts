import { randomUUID } from 'node:crypto';

export type AgentConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  /** Routing hint the Go gateway requires. Stable for one chat turn. */
  sessionId: string;
};

/**
 * OpenCode exposes two gateways that bill differently:
 *
 *   https://opencode.ai/zen/go/v1              → OpenCode Go subscription
 *   https://opencode.ai/inference/openai/v1   → pay-as-you-go credit balance
 *
 * The Go gateway rejects requests without an `x-opencode-session` header and
 * does not accept provider-prefixed model ids (opencode-go/...).
 */
export function agentConfig(): AgentConfig | null {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    baseURL: process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/zen/go/v1',
    model: process.env.OPENCODE_MODEL ?? 'deepseek-v4.1-flash',
    sessionId: process.env.OPENCODE_SESSION ?? randomUUID(),
  };
}
