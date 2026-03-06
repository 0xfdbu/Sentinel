/**
 * Sentinel API Server - Vault Event Listener
 * 
 * Listens for ETHDeposited events and triggers CRE workflow
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

import { config } from './utils/config';
import { logger, requestLogger } from './utils/logger';
import { errorHandler } from './utils/errors';
import { vaultListener } from './services/vault-listener.service';
import routes from './routes';

// Create Express app
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
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

// Start server
server.listen(config.server.port, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║       🛡️  SENTINEL API SERVER (Vault Listener)            ║
╠════════════════════════════════════════════════════════════╣
║  Environment: ${config.server.env.padEnd(45)}║
║  REST API:   http://localhost:${config.server.port.toString().padEnd(40)}║
║  Health:     http://localhost:${config.server.port}/api/health${''.padEnd(31)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Auto-start vault listener
  setTimeout(() => {
    logger.info('[VaultListener] Auto-starting...');
    vaultListener.start().catch((err: any) => {
      logger.error('[VaultListener] Failed to start:', err);
    });
  }, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  vaultListener.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  vaultListener.stop();
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
