/**
 * WebSocket Service
 * 
 * Manages WebSocket connections and real-time event broadcasting
 */

import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import type { WebSocketEvent, EventType } from '../types';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  
  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
    });
    
    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      logger.info('WebSocket client connected', { ip });
      
      this.clients.add(ws);
      
      // Send welcome message
      this.send(ws, {
        type: 'CONNECTED',
        timestamp: Date.now(),
        data: {
          message: 'Connected to Sentinel Monitor',
          clients: this.clients.size,
        },
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          logger.debug('WebSocket message received', { message });
          
          // Handle ping/pong
          if (message.type === 'ping') {
            this.send(ws, { type: 'CONNECTED', timestamp: Date.now(), data: { message: 'pong' } });
          }
        } catch (error) {
          logger.warn('Invalid WebSocket message', { error });
        }
      });
      
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });
    });
    
    logger.info('WebSocket server initialized');
  }
  
  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, event: WebSocketEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
  
  /**
   * Broadcast event to all connected clients
   */
  broadcast(type: EventType, data?: any): void {
    if (this.clients.size === 0) return;
    
    const event: WebSocketEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    
    const message = JSON.stringify(event);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    logger.debug('WebSocket broadcast', { type, clients: this.clients.size });
  }
  
  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
  
  /**
   * Close all connections
   */
  close(): void {
    this.wss?.close();
    this.clients.clear();
    logger.info('WebSocket server closed');
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
