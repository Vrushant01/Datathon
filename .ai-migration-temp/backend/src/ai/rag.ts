import { chatComplete, ChatMessage } from './catalystLLM';
import { buildSystemPrompt } from './promptBuilder';
import { aiLogger } from './logger';

export const generateAnswer = async (question: string, context: any, chatHistory: any[] = []) => {
  try {
    const systemPrompt = await buildSystemPrompt();

    let userContent = `User Question: ${question}\n\n`;
    if (context) {
      userContent += `Database Context:\n${JSON.stringify(context, null, 2)}\n\n`;
      userContent += `Please answer the user's question using strictly the Database Context provided above.\n`;
    } else {
      userContent += `No relevant database context was found or queried. Answer based on available knowledge or indicate that no data is available.\n`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userContent },
    ];

    const result = await chatComplete(messages, { temperature: 0.2, maxTokens: 800 });
    return result.content || 'No response generated.';
  } catch (err: any) {
    aiLogger.error(`Generation error: ${err.message}`);
    throw err;
  }
};
