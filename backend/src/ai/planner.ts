import { getAI } from './embeddings';
import { AI_CONFIG } from './config';
import { aiLogger } from './logger';
import { buildSystemPrompt } from './promptBuilder';

export interface QueryPlan {
  tool: 'findDocuments' | 'aggregate' | 'countDocuments' | 'similaritySearch' | 'none';
  collection?: string;
  query?: any;
  reasoning: string;
}

export const planQuery = async (question: string): Promise<QueryPlan> => {
  const ai = getAI();
  const prompt = await buildSystemPrompt();
  
  const instruction = `
Given the user's question, decide whether to use a direct MongoDB query (findDocuments, aggregate, countDocuments) or vector search (similaritySearch).
Return ONLY a valid JSON object matching this structure:
{
  "tool": "findDocuments" | "aggregate" | "countDocuments" | "similaritySearch" | "none",
  "collection": "collectionName if applicable",
  "query": {}, 
  "reasoning": "why you chose this"
}
If 'similaritySearch' is chosen, 'query' should be a string containing the semantic search text.
If 'none' is chosen, no database query will be run.
For aggregate, 'query' should be an array (the pipeline).
User Question: ${question}
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.LLM_MODEL,
      contents: instruction,
      config: {
        systemInstruction: prompt,
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text) as QueryPlan;
  } catch (err: any) {
    aiLogger.error(`Planner error: ${err.message}`);
    return { tool: 'none', reasoning: 'Planner failed' };
  }
};
