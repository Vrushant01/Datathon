import { API_BASE_URL } from '../config/api';

type Listener = (data: any) => void;

// All known event types - client registers all of them so addEventListener picks each up
const ALL_EVENT_TYPES = [
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
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private reconnectCallbacks: Set<() => void> = new Set();

  public connect() {
    if (this.eventSource || this.isConnected) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${API_BASE_URL}/api/events?token=${encodeURIComponent(token)}`;
    this.eventSource = new EventSource(url, { withCredentials: true });

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to event stream');
      const wasReconnect = this.reconnectAttempts > 0;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      // If this was a reconnect (not initial connect), notify pages to refetch missed changes
      if (wasReconnect) {
        console.log('[SSE] Reconnected — notifying pages to refetch');
        this.reconnectCallbacks.forEach(cb => {
          try { cb(); } catch (e) { console.error('[SSE] reconnect callback error', e); }
        });
      }
    };

    this.eventSource.onerror = () => {
      console.log('[SSE] Connection interrupted. Reconnecting...');
      this.isConnected = false;
      this.eventSource?.close();
      this.eventSource = null;
      
      // Auto-reconnect with exponential backoff (max 30s)
      if (!this.reconnectTimeout) {
        const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, backoff);
      }
    };

    // Register all known event types so browser fires named events correctly
    ALL_EVENT_TYPES.forEach(eventType => {
      this.eventSource?.addEventListener(eventType, (e: any) => {
        try {
          const data = JSON.parse(e.data);
          this.emit(eventType, data);
        } catch (err) {
          console.error(`[SSE] Failed to parse event data for ${eventType}`, err);
        }
      });
    });
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    console.log('[SSE] Disconnected');
  }

  public subscribe(eventType: string, callback: Listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Register a callback to be called when SSE reconnects after a disconnect.
   * Use this to refetch data on pages after reconnection to catch up with missed changes.
   * Returns an unsubscribe function.
   */
  public onReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.add(callback);
    return () => { this.reconnectCallbacks.delete(callback); };
  }

  private emit(eventType: string, data: any) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.forEach(listener => listener(data));
    }
  }
}

export const sseClient = new SSEClient();


