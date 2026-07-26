import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG } from './config';
import { aiLogger } from './logger';

let ai: GoogleGenAI | null = null;

export const getAI = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: AI_CONFIG.GOOGLE_API_KEY });
  }
  return ai;
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const aiInstance = getAI();
    const response = await aiInstance.models.embedContent({
      model: AI_CONFIG.EMBEDDING_MODEL,
      contents: text,
    });
    
    if (response.embeddings && response.embeddings.length > 0) {
      return response.embeddings[0].values as number[];
    }
    return [];
  } catch (err: any) {
    aiLogger.error(`Error generating embedding: ${err.message}`);
    throw err;
  }
};
