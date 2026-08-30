import { getCatalystAccessToken } from './catalystAuth';
import { aiLogger } from './logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatCompleteOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

const ENDPOINT_URL = process.env.CATALYST_LLM_ENDPOINT_URL
  || 'https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/glm/chat';
const CATALYST_ORG = process.env.CATALYST_ORG_ID || '60079756936';
const MODEL = process.env.CATALYST_LLM_MODEL || 'crm-di-glm47b_30b_it';

export interface ChatCompletionResult {
  content: string | null;
  toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> | null;
  raw: any;
}

export const chatComplete = async (
  messages: ChatMessage[],
  opts: ChatCompleteOptions = {}
): Promise<ChatCompletionResult> => {
  const accessToken = await getCatalystAccessToken();

  const body: Record<string, any> = {
    model: MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 500,
    temperature: opts.temperature ?? 0.2,
    stream: false,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.toolChoice) body.tool_choice = opts.toolChoice;

  const start = Date.now();
  const resp = await fetch(ENDPOINT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'CATALYST-ORG': CATALYST_ORG,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    aiLogger.error(`Catalyst LLM call failed: ${resp.status} ${text}`);
    throw new Error(`Catalyst LLM call failed: ${resp.status}`);
  }

  const json: any = await resp.json();
  aiLogger.info(`Catalyst LLM call completed in ${Date.now() - start}ms`);

  // OpenAI-compatible shape: choices[0].message.{content,tool_calls}
  const choice = json.choices?.[0];
  const message = choice?.message;

  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? null,
    raw: json,
  };
};
