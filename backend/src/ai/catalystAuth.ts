import { aiLogger } from './logger';

// Zoho OAuth2 refresh-token flow for the QuickML LLM Serving REST API.
// This is a *separate* auth mechanism from zcatalyst-sdk-node's app-level
// auth (catalyst.initialize) — QuickML's LLM Serving/RAG endpoints require
// a real Zoho user OAuth access token with scope QuickML.deployment.READ.

const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';

let cachedToken: { value: string; expiresAt: number } | null = null;

export const getCatalystAccessToken = async (): Promise<string> => {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) {
    return cachedToken.value;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN env vars for QuickML LLM auth.'
    );
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const resp = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token?${params.toString()}`, {
    method: 'POST',
  });

  if (!resp.ok) {
    const text = await resp.text();
    aiLogger.error(`Zoho token refresh failed: ${resp.status} ${text}`);
    throw new Error(`Zoho token refresh failed: ${resp.status}`);
  }

  const json: any = await resp.json();
  if (!json.access_token) {
    aiLogger.error(`Zoho token refresh response missing access_token: ${JSON.stringify(json)}`);
    throw new Error('Zoho token refresh response missing access_token.');
  }

  cachedToken = {
    value: json.access_token,
    // Zoho tokens are typically valid 3600s; trust expires_in if present.
    expiresAt: now + (Number(json.expires_in || 3600) * 1000),
  };

  return cachedToken.value;
};
