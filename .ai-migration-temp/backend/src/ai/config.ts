import dotenv from 'dotenv';
dotenv.config();

export const AI_CONFIG = {
  // Catalyst QuickML LLM Serving
  CATALYST_LLM_ENDPOINT_URL: process.env.CATALYST_LLM_ENDPOINT_URL
    || 'https://api.catalyst.zoho.in/quickml/v1/project/45359000000013024/glm/chat',
  CATALYST_ORG_ID: process.env.CATALYST_ORG_ID || '60079756936',
  CATALYST_LLM_MODEL: process.env.CATALYST_LLM_MODEL || 'crm-di-glm47b_30b_it',

  // Zoho OAuth2 (self-client) for the QuickML.deployment.READ scope
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID || '',
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || '',
  ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || '',
  ZOHO_ACCOUNTS_URL: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in',

  CHAT_HISTORY_LIMIT: parseInt(process.env.CHAT_HISTORY_LIMIT || '10', 10),
  MAX_CONTEXT_DOCUMENTS: parseInt(process.env.MAX_CONTEXT_DOCUMENTS || '8', 10),
  ENABLE_STREAMING: process.env.ENABLE_STREAMING !== 'false',
  ENABLE_QUERY_CACHE: process.env.ENABLE_QUERY_CACHE !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10),
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60', 10)
};
