/**
 * Enhanced SSE (Server-Sent Events) Client
 * Provides robust streaming with auto-reconnection, heartbeat, and error recovery.
 */

export interface SSEClientOptions {
  url: string;
  withCredentials?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onReconnect?: (attempt: number) => void;
}

export class EnhancedSSEClient {
  private eventSource: EventSource | null = null;
  private options: Required<Omit<SSEClientOptions, 'onMessage' | 'onError' | 'onOpen' | 'onClose' | 'onReconnect'>> & {
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onReconnect?: (attempt: number) => void;
  };
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private isIntentionallyClosed = false;

  constructor(options: SSEClientOptions) {
    this.options = {
      url: options.url,
      withCredentials: options.withCredentials ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      onMessage: options.onMessage,
      onError: options.onError,
      onOpen: options.onOpen,
      onClose: options.onClose,
      onReconnect: options.onReconnect,
    };
  }

  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.warn('SSE connection already open');
      return;
    }

    this.isIntentionallyClosed = false;
    this.eventSource = new EventSource(this.options.url, {
      withCredentials: this.options.withCredentials,
    });

    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      this.options.onOpen?.();
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.lastHeartbeat = Date.now();
      
      // Handle heartbeat messages
      if (event.data === 'ping' || event.data === 'heartbeat') {
        return;
      }

      this.options.onMessage?.(event);
    };

    this.eventSource.onerror = (error: Event) => {
      console.error('SSE error:', error);
      this.options.onError?.(error);

      // Attempt reconnection if not intentionally closed
      if (!this.isIntentionallyClosed && this.eventSource?.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.options.onClose?.();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5); // Exponential backoff cap

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.options.onReconnect?.(this.reconnectAttempts);
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.options.heartbeatInterval * 2) {
        console.warn('Heartbeat timeout - connection may be dead');
        if (this.eventSource) {
          this.eventSource.close();
          this.scheduleReconnect();
        }
      }
    }, this.options.heartbeatInterval);
  }

  close(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.options.onClose?.();
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
