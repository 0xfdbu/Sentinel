/**
 * Sentinel API Server
 * 
 * Entry point for the API server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

import { config } from './utils/config';
import { logger, requestLogger } from './utils/logger';
import { errorHandler } from './utils/errors';
import { websocketService } from './services/websocket.service';
import routes from './routes';

// Create Express app
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger());

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Initialize WebSocket
websocketService.initialize(server);

// Start server
server.listen(config.server.port, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║              🛡️  SENTINEL API SERVER                      ║
╠════════════════════════════════════════════════════════════╣
║  Environment: ${config.server.env.padEnd(45)}║
║  REST API:   http://localhost:${config.server.port.toString().padEnd(40)}║
║  WebSocket:  ws://localhost:${config.server.port}/ws${''.padEnd(37)}║
║  Health:     http://localhost:${config.server.port}/api/health${''.padEnd(31)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  websocketService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  websocketService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});
