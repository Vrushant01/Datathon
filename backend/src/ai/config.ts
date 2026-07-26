import dotenv from 'dotenv';
dotenv.config();

export const AI_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017',
  MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'ksp_analytics',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  LLM_MODEL: process.env.LLM_MODEL || 'gemini-3.5-flash-lite',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  CHAT_HISTORY_LIMIT: parseInt(process.env.CHAT_HISTORY_LIMIT || '10', 10),
  MAX_CONTEXT_DOCUMENTS: parseInt(process.env.MAX_CONTEXT_DOCUMENTS || '8', 10),
  ENABLE_STREAMING: process.env.ENABLE_STREAMING !== 'false',
  ENABLE_QUERY_CACHE: process.env.ENABLE_QUERY_CACHE !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10),
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60', 10)
};
