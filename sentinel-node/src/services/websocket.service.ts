/**
 * WebSocket Service - Real-time client communication
 */

import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';

export class WebSocketService {
  private wss?: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Start WebSocket server
   */
  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(data: unknown): void {
    const msg = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  /**
   * Send message to specific client
   */
  send(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Get number of connected clients
   */
  get clientCount(): number {
    return this.clients.size;
  }
}
