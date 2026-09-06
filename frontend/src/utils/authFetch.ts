import { API_BASE_URL } from '../config/api';

// Global promise for the refresh operation
let refreshTokenPromise: Promise<string> | null = null;

function clearAuthAndRedirect(errorData?: any) {
  localStorage.removeItem('token');
  localStorage.removeItem('ksp_auth_user');

  const path = window.location.pathname;
  if (path.startsWith('/analytics')) {
    window.location.href = '/analytics-login';
  } else if (path.startsWith('/officer')) {
    window.location.href = '/login';
  } else {
    window.location.href = '/admin-login';
  }

  return new Response(JSON.stringify({ error: 'Session expired. Redirecting to login.', details: errorData }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Attempts to silently refresh the access token via the /api/auth/refresh endpoint.
 * The httpOnly refresh token cookie is sent automatically by the browser.
 * Returns the new access token on success, or throws on failure.
 */
async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',    // Send the ksp_rt httpOnly cookie
  });

  if (!response.ok) {
    throw new Error('Refresh failed');
  }

  const data = await response.json();
  if (!data.success || !data.token) {
    throw new Error('Refresh returned no token');
  }
  return data.token;
}

/**
 * authFetch: drop-in replacement for fetch() that:
 *   1. Attaches the current Bearer access token from localStorage.
 *   2. On 401, silently refreshes the token and retries the request once.
 *   3. On failed refresh, clears local auth state and redirects to /login.
 *   4. Avoids duplicate refresh requests concurrently.
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // ── Pre-flight check ────────────────────────────────────────────────────────
  // If a refresh is ALREADY happening in this tab, await it BEFORE making the first attempt.
  // This prevents sending 9 simultaneous requests with an obviously expired token.
  if (refreshTokenPromise) {
    try {
      const newToken = await refreshTokenPromise;
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${newToken}`);
      return await fetch(input, { ...init, headers });
    } catch (err) {
      // If the pending refresh fails, this queued request also fails
      return clearAuthAndRedirect(err);
    }
  }

  const initialToken = localStorage.getItem('token');
  
  const buildHeaders = (t: string | null): Headers => {
    const headers = new Headers(init?.headers);
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return headers;
  };

  // ── First attempt ────────────────────────────────────────────────────────────
  const firstResponse = await fetch(input, {
    ...init,
    headers: buildHeaders(initialToken),
  });

  // Only handle 401. 403 means "Forbidden/Insufficient Role", not "Token Expired".
  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  // ── 401 received ─────────────────────────────────────────────────────────────
  
  // Cross-tab concurrency check:
  // Did another tab (or another rapid request in this tab) already refresh the token while we were in-flight?
  const currentToken = localStorage.getItem('token');
  if (currentToken && currentToken !== initialToken) {
    // The token was successfully refreshed by someone else. Retry immediately.
    return await fetch(input, {
      ...init,
      headers: buildHeaders(currentToken),
    });
  }

  // If no refresh is happening in this tab, we must be the one to start it.
  if (!refreshTokenPromise) {
    refreshTokenPromise = refreshAccessToken()
      .then(newToken => {
        localStorage.setItem('token', newToken);
        return newToken;
      })
      .catch(err => {
        // We will throw the error so that all awaiting requests know it failed,
        // but the redirection is handled by each request catching it.
        throw err;
      })
      .finally(() => {
        // Clear the promise so future requests evaluate the new state
        refreshTokenPromise = null;
      });
  }

  // Await the shared refresh promise
  try {
    const newToken = await refreshTokenPromise;
    // Retry original request exactly once
    return await fetch(input, {
      ...init,
      headers: buildHeaders(newToken),
    });
  } catch (refreshError) {
    return clearAuthAndRedirect(refreshError);
  }
};
