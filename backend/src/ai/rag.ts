import { getAI } from './embeddings';
import { AI_CONFIG } from './config';
import { buildSystemPrompt } from './promptBuilder';
import { aiLogger } from './logger';

export const generateAnswer = async (question: string, context: any, chatHistory: any[] = []) => {
  try {
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
      ...chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const response = await ai.models.generateContent({
      model: AI_CONFIG.LLM_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "No response generated.";
  } catch (err: any) {
    aiLogger.error(`Generation error: ${err.message}`);
    throw err;
  }
};
