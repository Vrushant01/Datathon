import { aiLogger } from './logger';
import { QuickMLChatService } from '../services/quickmlChatService';

export class ChatSession {
  private history: { role: 'user' | 'model', content: string }[] = [];

  constructor() {}

  async processMessage(req: any, question: string, onToken?: (token: string) => void): Promise<string> {
    try {
      aiLogger.info(`Processing chat message via QuickML GLM-4.7-Flash`);
      
      // Pass the request to our QuickML service abstraction
      const answer = await QuickMLChatService.processMessage(req, question, this.history);
      
      // Save history
      this.history.push({ role: 'user', content: question });
      this.history.push({ role: 'model', content: answer });

      // In real streaming, onToken would be called during the processMessage loop.
      if (onToken) {
        onToken(answer);
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

