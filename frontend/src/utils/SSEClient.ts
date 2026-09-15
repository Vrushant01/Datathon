import { API_BASE_URL } from '../config/api';

type Listener = (data: any) => void;
export type SSEStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

// All known DATABASE event types.
// HEARTBEAT is intentionally absent — it is silently consumed without reaching application listeners.
const DB_EVENT_TYPES = [
  'CONNECTED',
  'FIR_CREATED', 'FIR_UPDATED', 'FIR_DELETED',
  'OFFICER_CREATED', 'OFFICER_UPDATED', 'OFFICER_DELETED',
  'STATION_CREATED', 'STATION_UPDATED', 'STATION_DELETED',
  'ASSIGNMENT_UPDATED',
  'CASE_ENTITY_CREATED', 'CASE_ENTITY_UPDATED', 'CASE_ENTITY_DELETED',
  'CASE_EDGE_CREATED',
];

class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private statusListeners: Set<(s: SSEStatus) => void> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private stabilityTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private status: SSEStatus = 'disconnected';
  // Guard: prevent a second EventSource from being created while one is being set up
  private isConnecting = false;

  private setStatus(s: SSEStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach(cb => { try { cb(s); } catch (_) {} });
  }

  public getStatus(): SSEStatus {
    return this.status;
  }

  /**
   * Subscribe to connection status changes.
   * Immediately calls cb with the current status upon registration.
   */
  public onStatusChange(cb: (s: SSEStatus) => void): () => void {
    this.statusListeners.add(cb);
    try { cb(this.status); } catch (_) {}
    return () => { this.statusListeners.delete(cb); };
  }

  /**
   * Create the SSE connection. Safe to call multiple times — idempotent.
   * Will not create a second EventSource if one already exists or is being created.
   */
  public connect() {
    if (this.eventSource || this.isConnecting) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.isConnecting = true;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const url = `${API_BASE_URL}/api/events?token=${encodeURIComponent(token)}`;
    let es: EventSource;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch (err) {
      console.error('[SSE] Failed to create EventSource', err);
      this.isConnecting = false;
      this._scheduleReconnect();
      return;
    }
    this.eventSource = es;

    es.onopen = () => {
      console.log('[SSE] Connected to event stream');
      this.isConnecting = false;
      this.setStatus('connected');

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Only reset backoff counter after 10 seconds of uninterrupted stability
      if (this.stabilityTimeout) clearTimeout(this.stabilityTimeout);
      this.stabilityTimeout = setTimeout(() => {
        this.reconnectAttempts = 0;
      }, 10_000);
    };

    es.onerror = () => {
      // onerror fires for: network drop, server-side close, or 4xx responses.
      // EventSource does NOT expose HTTP status codes, so we handle all cases here.
      // We kill the current instance to stop the browser's built-in auto-retry
      // (which would reuse the same possibly-expired token forever).
      console.log('[SSE] Connection interrupted. Reconnecting...');

      es.close();
      if (this.eventSource === es) {
        this.eventSource = null;
      }
      this.isConnecting = false;

      if (this.stabilityTimeout) {
        clearTimeout(this.stabilityTimeout);
        this.stabilityTimeout = null;
      }

      this._scheduleReconnect();
    };

    // Register DB event listeners
    DB_EVENT_TYPES.forEach(eventType => {
      es.addEventListener(eventType, (e: any) => {
        try {
          const data = JSON.parse(e.data);
          this.emit(eventType, data);
        } catch (err) {
          console.error(`[SSE] Failed to parse event data for ${eventType}`, err);
        }
      });
    });

    // Silently absorb HEARTBEAT — must never reach application data handlers
    es.addEventListener('HEARTBEAT', () => { /* intentionally empty */ });
  }

  private _scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.setStatus('reconnecting');

    // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped)
    const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (this.eventSource || this.isConnecting) return;

      // CRITICAL FIX: Before reconnecting, check if the JWT needs refreshing.
      // The SSE connection passes the token as a query param. After 1 hour, the
      // token expires, the backend returns 401, the connection drops, and the
      // browser retries with the same expired token creating an infinite loop.
      await this._ensureFreshToken();

      if (!this.eventSource && !this.isConnecting) {
        this.connect();
      }
    }, backoff);
  }

  /**
   * Silently refresh the access token if it is expired or within 5 minutes of expiry.
   * Does NOT redirect or disconnect — only updates localStorage.
   */
  private async _ensureFreshToken(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payloadB64 = token.split('.')[1];
      if (!payloadB64) return;
      const payload = JSON.parse(atob(payloadB64));
      const expiresAt = (payload.exp || 0) * 1000;
      const now = Date.now();

      if (expiresAt - now < 5 * 60 * 1000) {
        console.log('[SSE] Token near/past expiry — refreshing before reconnect');
        const resp = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.token) {
            localStorage.setItem('token', data.token);
            console.log('[SSE] Token refreshed successfully');
          }
        } else {
          // Refresh token also expired — stop SSE reconnect loop gracefully
          console.warn('[SSE] Token refresh failed — pausing SSE reconnect');
          this.setStatus('disconnected');
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
        }
      }
    } catch (err) {
      console.warn('[SSE] Token expiry check error:', err);
    }
  }

  /**
   * Cleanly destroy the connection. Called on logout or app teardown.
   */
  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.stabilityTimeout) {
      clearTimeout(this.stabilityTimeout);
      this.stabilityTimeout = null;
    }
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
    console.log('[SSE] Disconnected');
  }

  /**
   * Subscribe to a named database event.
   * Returns an unsubscribe function.
   */
  public subscribe(eventType: string, callback: Listener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: string, data: any) {
    this.listeners.get(eventType)?.forEach(listener => {
      try { listener(data); } catch (e) { console.error('[SSE] listener error', e); }
    });
  }
}

// Singleton — one shared connection for the entire browser session
export const sseClient = new SSEClient();
