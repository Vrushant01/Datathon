import { API_BASE_URL } from '../config/api';

// Internal flag to prevent a refresh call from recursively triggering another refresh
let isRefreshing = false;

// Queue of callbacks waiting for the current refresh to complete
// (handles the case where multiple concurrent requests all hit 401 simultaneously)
type QueueEntry = { resolve: (token: string) => void; reject: (err: any) => void };
let refreshQueue: QueueEntry[] = [];

function drainQueue(token: string | null, err: any) {
  refreshQueue.forEach(entry => (token ? entry.resolve(token) : entry.reject(err)));
  refreshQueue = [];
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
 *
 * All 20+ call sites across the app benefit automatically — no changes needed there.
 */
export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem('token');

  const buildHeaders = (t: string | null): Headers => {
    const headers = new Headers(init?.headers);
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return headers;
  };

  // ── First attempt ────────────────────────────────────────────────────────────
  const firstResponse = await fetch(input, {
    ...init,
    headers: buildHeaders(token),
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  // ── 401 received — attempt token refresh ─────────────────────────────────────
  // If a refresh is already in-flight, queue this request until it resolves.
  if (isRefreshing) {
    return new Promise<Response>((resolve, reject) => {
      refreshQueue.push({
        resolve: async (newToken) => {
          const retryResponse = await fetch(input, {
            ...init,
            headers: buildHeaders(newToken),
          });
          resolve(retryResponse);
        },
        reject,
      });
    });
  }

  // This request is the first to hit 401 — it becomes the refresh driver.
  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    localStorage.setItem('token', newToken);
    isRefreshing = false;
    drainQueue(newToken, null);

    // Retry the original request with the fresh token
    return await fetch(input, {
      ...init,
      headers: buildHeaders(newToken),
    });

  } catch (refreshError) {
    // Refresh token is also expired/invalid — force logout
    isRefreshing = false;
    drainQueue(null, refreshError);

    localStorage.removeItem('token');
    localStorage.removeItem('ksp_auth_user');

    // Redirect to root login — detect which portal based on current path
    const path = window.location.pathname;
    if (path.startsWith('/analytics')) {
      window.location.href = '/analytics-login';
    } else if (path.startsWith('/officer')) {
      window.location.href = '/login';
    } else {
      window.location.href = '/admin-login';
    }

    // Return a synthetic 401 so any caller that checks the status code isn't left hanging
    return new Response(JSON.stringify({ error: 'Session expired. Redirecting to login.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
