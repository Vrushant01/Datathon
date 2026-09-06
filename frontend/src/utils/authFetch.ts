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
  
  // Use Web Locks API for true cross-tab synchronization.
  // Only one tab can hold the 'ksp_auth_refresh' lock at a time.
  try {
    const newToken = await navigator.locks.request('ksp_auth_refresh', async () => {
      // Once we have the lock, check if another tab ALREADY refreshed the token
      // while we were waiting for the lock.
      const currentToken = localStorage.getItem('token');
      if (currentToken && currentToken !== initialToken) {
        return currentToken;
      }

      // If no refresh is happening in this tab, we must be the one to start it.
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshAccessToken()
          .then(token => {
            localStorage.setItem('token', token);
            return token;
          })
          .catch(err => {
            throw err;
          })
          .finally(() => {
            refreshTokenPromise = null;
          });
      }

      return await refreshTokenPromise;
    });

    // Retry original request exactly once with the new token
    return await fetch(input, {
      ...init,
      headers: buildHeaders(newToken),
    });
  } catch (refreshError) {
    return clearAuthAndRedirect(refreshError);
  }
};
