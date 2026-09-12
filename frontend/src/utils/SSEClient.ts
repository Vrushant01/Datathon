import { API_BASE_URL } from '../config/api';

type Listener = (data: any) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;

  public connect() {
    if (this.eventSource || this.isConnected) return;
    
    // Auth token needed for SSE
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use withCredentials or pass token in URL if backend doesn't support headers for EventSource
    // EventSource in browser doesn't natively support custom headers like Authorization.
    // We pass it via query param `?token=` and ensure the backend `requireAuth` middleware can parse it.
    // Alternatively, just proxy it and rely on cookie. We'll use the query param approach.
    const url = `${API_BASE_URL}/api/events?token=${encodeURIComponent(token)}`;

    this.eventSource = new EventSource(url, { withCredentials: true });

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to event stream');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.eventSource.onerror = (err) => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('[SSE] Connection closed.');
      } else {
        console.log('[SSE] Connection interrupted. Reconnecting...');
      }
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

    // Generic listener for all custom events (EventSource fires events by name)
    const eventTypes = ['CONNECTED', 'FIR_CREATED', 'OFFICER_CREATED', 'STATION_CREATED', 'CASE_ENTITY_CREATED', 'CASE_ENTITY_UPDATED', 'CASE_ENTITY_DELETED', 'CASE_EDGE_CREATED'];
    
    eventTypes.forEach(eventType => {
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

  private emit(eventType: string, data: any) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.forEach(listener => listener(data));
    }
  }
}

export const sseClient = new SSEClient();
