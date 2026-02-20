/**
 * Sentinel API Client
 * 
 * Connects to the Sentinel API Server for:
 * - REST API calls
 * - WebSocket real-time events
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

// REST API client
export async function api(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// WebSocket client
export class SentinelWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('[Sentinel WS] Connected');
      this.reconnectAttempts = 0;
      this.emit('connected', { timestamp: Date.now() });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type?.toLowerCase() || 'message', data);
      } catch (error) {
        console.error('[Sentinel WS] Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[Sentinel WS] Disconnected');
      this.emit('disconnected', {});
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[Sentinel WS] Error:', error);
      this.emit('error', error);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Sentinel WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[Sentinel WS] Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  on(event: string, callback: (data: any) => void) {
    const normalizedEvent = event.toLowerCase();
    if (!this.listeners.has(normalizedEvent)) {
      this.listeners.set(normalizedEvent, []);
    }
    this.listeners.get(normalizedEvent)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const normalizedEvent = event.toLowerCase();
    const callbacks = this.listeners.get(normalizedEvent);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const normalizedEvent = event.toLowerCase();
    this.listeners.get(normalizedEvent)?.forEach(cb => cb(data));
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// API methods
export const sentinelApi = {
  // Health
  health: () => api('/health'),

  // Monitor
  getMonitorStatus: () => api('/api/monitor/status') as Promise<{
    success: boolean;
    data: {
      isRunning: boolean;
      creMode: 'SIMULATION' | 'CRE';
      confidentialHttp: boolean;
      teeEnabled: boolean;
      [key: string]: any;
    };
  }>,
  getEvents: (params?: { limit?: number; level?: string; contract?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return api(`/api/monitor/events?${query}`);
  },

  // Scan
  scanContract: (contractAddress: string, chainId: number = 11155111) =>
    api('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ contractAddress, chainId }),
    }),

  // Fraud check
  checkFraud: (tx: any, contractAddress: string) =>
    api('/api/fraud-check', {
      method: 'POST',
      body: JSON.stringify({ tx, contractAddress }),
    }),
};

// Singleton WebSocket instance
export const sentinelWs = new SentinelWebSocket();
