import { planQuery } from './planner';
import { retrieveContext } from './retriever';
import { generateAnswer } from './rag';
import { aiLogger } from './logger';
import { AI_CONFIG } from './config';
import { getAI } from './embeddings';
import { buildSystemPrompt } from './promptBuilder';

export class ChatSession {
  private history: { role: 'user' | 'model', content: string }[] = [];

  constructor() {}

  async processMessage(question: string, onToken?: (token: string) => void): Promise<string> {
    try {
      const plan = await planQuery(question);
      aiLogger.info(`Plan generated`, plan);

      const context = await retrieveContext(plan);
      
      let answer = '';

      if (AI_CONFIG.ENABLE_STREAMING && onToken) {
        const ai = getAI();
        const systemPrompt = await buildSystemPrompt();
        
        let prompt = `User Question: ${question}\n\n`;
        if (context) {
          prompt += `Database Context:\n${JSON.stringify(context, null, 2)}\n\n`;
          prompt += `Please answer the user's question using strictly the Database Context provided above.\n`;
        } else {
          prompt += `No relevant database context was found or queried. Answer based on available knowledge or indicate that no data is available.\n`;
        }

        const contents = [
          ...this.history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: prompt }] }
        ];

        const responseStream = await ai.models.generateContentStream({
          model: AI_CONFIG.LLM_MODEL,
          contents,
          config: { systemInstruction: systemPrompt }
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            onToken(chunk.text);
            answer += chunk.text;
          }
        }
      } else {
        answer = await generateAnswer(question, context, this.history);
      }

      this.history.push({ role: 'user', content: question });
      this.history.push({ role: 'model', content: answer });

      if (this.history.length > AI_CONFIG.CHAT_HISTORY_LIMIT * 2) {
        this.history = this.history.slice(this.history.length - AI_CONFIG.CHAT_HISTORY_LIMIT * 2);
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
