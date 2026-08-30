import { planQuery } from './planner';
import { retrieveContext } from './retriever';
import { generateAnswer } from './rag';
import { aiLogger } from './logger';
import { AI_CONFIG } from './config';

export class ChatSession {
  private history: { role: 'user' | 'model' | 'assistant', content: string }[] = [];

  constructor() {}

  // req is threaded through to CloudScale so getCatalystApp(req) can
  // authenticate on AppSail (see backend/src/repositories/CloudScaleRepository.ts).
  async processMessage(req: any, question: string, onToken?: (token: string) => void): Promise<string> {
    try {
      const plan = await planQuery(question, req, this.history);
      aiLogger.info(`Plan generated`, plan);

      let context = await retrieveContext(plan, req);

      if (context?.useRag) {
        context = { note: 'Answer from general knowledge/Knowledge Base context; no exact CloudScale record applies.' };
      }

      const answer = await generateAnswer(question, context, this.history, req, plan);

      this.history.push({ role: 'user', content: question });
      
      // Store a brief note of the context that was retrieved so future turns know what data was loaded
      if (context && !context.useRag && plan.tool !== 'none') {
        const toolStr = plan.tool;
        const argStr = plan.personName || plan.collection || '';
        this.history.push({ 
          role: 'assistant', 
          content: `[Internal Tool Execution: ${toolStr} on ${argStr} returned ${context.totalCases || context.count || (Array.isArray(context.cases || context) ? (context.cases || context).length : 1)} results]` 
        });
      }

      // The Catalyst LLM Serving endpoint's streaming response format isn't
      // confirmed yet (sample snippet only shows stream:false). Simulate
      // incremental delivery so the existing UI typing effect still works;
      // swap for real SSE once the streaming response shape is verified.
      if (AI_CONFIG.ENABLE_STREAMING && onToken) {
        const chunkSize = 6;
        for (let i = 0; i < answer.length; i += chunkSize) {
          onToken(answer.slice(i, i + chunkSize));
        }
      }

      this.history.push({ role: 'assistant', content: answer });

      if (this.history.length > AI_CONFIG.CHAT_HISTORY_LIMIT * 3) {
        this.history = this.history.slice(this.history.length - AI_CONFIG.CHAT_HISTORY_LIMIT * 3);
      }

      return answer;
    } catch (err: any) {
      aiLogger.error(`Chat session error: ${err.message}`);
      throw err;
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

const sessions = new Map<string, ChatSession>();

export const getSession = (sessionId: string) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new ChatSession());
  }
  return sessions.get(sessionId)!;
};
